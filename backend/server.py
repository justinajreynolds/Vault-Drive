from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import uuid
import shutil
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from docx import Document as DocxDocument
from openpyxl import Workbook

# ----------------------- Config -----------------------
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

PLANS = {
    "free": {"id": "free", "name": "Free", "storage_bytes": 256 * 1024 ** 3, "price": 0, "features": ["256 GB storage", "File preview", "Share via link", "All file types"]},
    "pro": {"id": "pro", "name": "Pro", "storage_bytes": 500 * 1024 ** 3, "price": 4.99, "features": ["500 GB storage", "Priority uploads", "30-day trash", "Email support"]},
    "premium": {"id": "premium", "name": "Premium", "storage_bytes": 1024 * 1024 ** 3, "price": 9.99, "features": ["1 TB storage", "Advanced sharing", "60-day trash", "Priority support"]},
    "premium_plus": {"id": "premium_plus", "name": "Premium+", "storage_bytes": 2 * 1024 * 1024 ** 3, "price": 19.99, "features": ["2 TB storage", "Team sharing", "90-day trash", "24/7 support"]},
}

# ----------------------- DB -----------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ----------------------- App -----------------------
app = FastAPI(title="Vault Drive API")
api = APIRouter(prefix="/api")

# ----------------------- Helpers -----------------------

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": now_utc() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    # query param fallback for inline media
    t = request.query_params.get("token")
    if t:
        return t
    c = request.cookies.get("access_token")
    return c


async def get_current_user(request: Request) -> dict:
    token = extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def user_public(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u.get("name", ""),
        "plan": u.get("plan", "free"),
        "storage_used": u.get("storage_used", 0),
        "storage_quota": u.get("storage_quota", PLANS["free"]["storage_bytes"]),
        "created_at": u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at"),
    }


async def log_activity(user_id: str, action: str, target_type: str, target_name: str, target_id: Optional[str] = None):
    await db.activity.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,  # uploaded, deleted, renamed, created, restored, trashed, starred, unstarred, downloaded, shared
        "target_type": target_type,  # file, folder
        "target_name": target_name,
        "target_id": target_id,
        "timestamp": now_utc(),
    })


# ----------------------- Models -----------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=64)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    parent_id: Optional[str] = None


class RenameIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class UpgradeIn(BaseModel):
    plan_id: str


# ----------------------- Auth Routes -----------------------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "plan": "free",
        "storage_used": 0,
        "storage_quota": PLANS["free"]["storage_bytes"],
        "created_at": now_utc(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    await log_activity(user_id, "created", "account", "Account created")
    return {"token": token, "user": user_public(doc)}


@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"])
    return {"token": token, "user": user_public(user)}


@api.post("/auth/logout")
async def logout():
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user_public(user)


# ----------------------- Folder Routes -----------------------
@api.get("/folders")
async def list_folders(parent_id: Optional[str] = None, all: Optional[bool] = False, user: dict = Depends(get_current_user)):
    q: dict = {"user_id": user["id"], "trashed": False}
    if not all:
        q["parent_id"] = parent_id
    folders = await db.folders.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    for f in folders:
        if isinstance(f.get("created_at"), datetime):
            f["created_at"] = f["created_at"].isoformat()
    return folders


@api.post("/folders")
async def create_folder(body: FolderCreate, user: dict = Depends(get_current_user)):
    parent_id = body.parent_id
    if parent_id:
        parent = await db.folders.find_one({"id": parent_id, "user_id": user["id"]})
        if not parent:
            raise HTTPException(status_code=404, detail="Parent folder not found")
    folder = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": body.name.strip(),
        "parent_id": parent_id,
        "trashed": False,
        "created_at": now_utc(),
    }
    await db.folders.insert_one(folder)
    await log_activity(user["id"], "created", "folder", folder["name"], folder["id"])
    folder.pop("_id", None)
    folder["created_at"] = folder["created_at"].isoformat()
    return folder


@api.put("/folders/{folder_id}")
async def rename_folder(folder_id: str, body: RenameIn, user: dict = Depends(get_current_user)):
    res = await db.folders.update_one(
        {"id": folder_id, "user_id": user["id"]},
        {"$set": {"name": body.name.strip()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Folder not found")
    await log_activity(user["id"], "renamed", "folder", body.name.strip(), folder_id)
    return {"ok": True}


@api.delete("/folders/{folder_id}")
async def trash_folder(folder_id: str, user: dict = Depends(get_current_user)):
    folder = await db.folders.find_one({"id": folder_id, "user_id": user["id"]})
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    await db.folders.update_one({"id": folder_id}, {"$set": {"trashed": True, "trashed_at": now_utc()}})
    # also trash files inside
    await db.files.update_many(
        {"folder_id": folder_id, "user_id": user["id"], "trashed": False},
        {"$set": {"trashed": True, "trashed_at": now_utc()}},
    )
    await log_activity(user["id"], "trashed", "folder", folder["name"], folder_id)
    return {"ok": True}


# ----------------------- File Routes -----------------------
def detect_kind(mime: str, name: str) -> str:
    m = (mime or "").lower()
    n = name.lower()
    if m.startswith("image/") or n.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
        return "image"
    if m.startswith("video/") or n.endswith((".mp4", ".mov", ".avi", ".webm", ".mkv")):
        return "video"
    if m.startswith("audio/") or n.endswith((".mp3", ".wav", ".m4a", ".ogg", ".flac")):
        return "audio"
    if m == "application/pdf" or n.endswith(".pdf"):
        return "pdf"
    if n.endswith((".zip", ".rar", ".7z", ".tar", ".gz")):
        return "archive"
    if n.endswith((".doc", ".docx", ".txt", ".md", ".rtf")):
        return "document"
    if n.endswith((".xls", ".xlsx", ".csv")):
        return "spreadsheet"
    return "document"


@api.post("/files/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    folder_id: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    user_dir = UPLOAD_DIR / user["id"]
    user_dir.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())
    dest = user_dir / file_id

    # Save to disk and count size
    size = 0
    with open(dest, "wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            out.write(chunk)

    # Check quota
    fresh_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    used = fresh_user.get("storage_used", 0)
    quota = fresh_user.get("storage_quota", PLANS["free"]["storage_bytes"])
    if used + size > quota:
        try:
            dest.unlink()
        except Exception:
            pass
        raise HTTPException(status_code=413, detail="Storage quota exceeded. Upgrade your plan.")

    # Validate folder
    if folder_id:
        parent = await db.folders.find_one({"id": folder_id, "user_id": user["id"], "trashed": False})
        if not parent:
            try:
                dest.unlink()
            except Exception:
                pass
            raise HTTPException(status_code=404, detail="Folder not found")

    mime = file.content_type or "application/octet-stream"
    name = file.filename or "Untitled"
    kind = detect_kind(mime, name)
    meta = {
        "id": file_id,
        "user_id": user["id"],
        "folder_id": folder_id,
        "name": name,
        "mime": mime,
        "kind": kind,
        "size": size,
        "storage_path": str(dest),
        "starred": False,
        "trashed": False,
        "share_token": None,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await db.files.insert_one(meta)
    await db.users.update_one({"id": user["id"]}, {"$inc": {"storage_used": size}})
    await log_activity(user["id"], "uploaded", "file", name, file_id)

    meta.pop("_id", None)
    meta.pop("storage_path", None)
    meta["created_at"] = meta["created_at"].isoformat()
    meta["updated_at"] = meta["updated_at"].isoformat()
    return meta


def _serialize_file(f: dict) -> dict:
    f = dict(f)
    f.pop("_id", None)
    f.pop("storage_path", None)
    f.pop("password_hash", None)
    for k in ("created_at", "updated_at", "trashed_at"):
        if isinstance(f.get(k), datetime):
            f[k] = f[k].isoformat()
    return f


@api.get("/files")
async def list_files(
    folder_id: Optional[str] = None,
    starred: Optional[bool] = None,
    recent: Optional[bool] = None,
    trashed: Optional[bool] = False,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q: dict = {"user_id": user["id"], "trashed": bool(trashed)}
    if starred:
        q["starred"] = True
    if folder_id is not None and not recent and not starred:
        q["folder_id"] = folder_id
    if search:
        q["name"] = {"$regex": search, "$options": "i"}
    sort_field = "updated_at" if recent else "created_at"
    files = await db.files.find(q, {"_id": 0, "storage_path": 0}).sort(sort_field, -1).to_list(1000)
    for f in files:
        for k in ("created_at", "updated_at", "trashed_at"):
            if isinstance(f.get(k), datetime):
                f[k] = f[k].isoformat()
    return files


@api.get("/files/{file_id}")
async def get_file(file_id: str, user: dict = Depends(get_current_user)):
    f = await db.files.find_one({"id": file_id, "user_id": user["id"]})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    return _serialize_file(f)


@api.get("/files/{file_id}/content")
async def file_content(file_id: str, request: Request, user: dict = Depends(get_current_user)):
    f = await db.files.find_one({"id": file_id, "user_id": user["id"]})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    path = Path(f["storage_path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="File content missing")

    def iter_file():
        with open(path, "rb") as fh:
            while True:
                chunk = fh.read(1024 * 1024)
                if not chunk:
                    break
                yield chunk

    headers = {"Content-Length": str(f["size"])}
    return StreamingResponse(iter_file(), media_type=f.get("mime", "application/octet-stream"), headers=headers)


@api.get("/files/{file_id}/download")
async def download_file(file_id: str, user: dict = Depends(get_current_user)):
    f = await db.files.find_one({"id": file_id, "user_id": user["id"]})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    path = Path(f["storage_path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="File content missing")
    await log_activity(user["id"], "downloaded", "file", f["name"], file_id)

    def iter_file():
        with open(path, "rb") as fh:
            while True:
                chunk = fh.read(1024 * 1024)
                if not chunk:
                    break
                yield chunk

    headers = {
        "Content-Length": str(f["size"]),
        "Content-Disposition": f'attachment; filename="{f["name"]}"',
    }
    return StreamingResponse(iter_file(), media_type=f.get("mime", "application/octet-stream"), headers=headers)


@api.put("/files/{file_id}")
async def rename_file(file_id: str, body: RenameIn, user: dict = Depends(get_current_user)):
    res = await db.files.update_one(
        {"id": file_id, "user_id": user["id"]},
        {"$set": {"name": body.name.strip(), "updated_at": now_utc()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    await log_activity(user["id"], "renamed", "file", body.name.strip(), file_id)
    return {"ok": True}


@api.post("/files/{file_id}/star")
async def star_file(file_id: str, user: dict = Depends(get_current_user)):
    f = await db.files.find_one({"id": file_id, "user_id": user["id"]})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    new_val = not f.get("starred", False)
    await db.files.update_one({"id": file_id}, {"$set": {"starred": new_val}})
    await log_activity(user["id"], "starred" if new_val else "unstarred", "file", f["name"], file_id)
    return {"starred": new_val}


@api.post("/files/{file_id}/trash")
async def trash_file(file_id: str, user: dict = Depends(get_current_user)):
    f = await db.files.find_one({"id": file_id, "user_id": user["id"]})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    await db.files.update_one({"id": file_id}, {"$set": {"trashed": True, "trashed_at": now_utc()}})
    await log_activity(user["id"], "trashed", "file", f["name"], file_id)
    return {"ok": True}


@api.post("/files/{file_id}/restore")
async def restore_file(file_id: str, user: dict = Depends(get_current_user)):
    f = await db.files.find_one({"id": file_id, "user_id": user["id"]})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    await db.files.update_one({"id": file_id}, {"$set": {"trashed": False}, "$unset": {"trashed_at": ""}})
    await log_activity(user["id"], "restored", "file", f["name"], file_id)
    return {"ok": True}


@api.delete("/files/{file_id}/permanent")
async def permanent_delete_file(file_id: str, user: dict = Depends(get_current_user)):
    f = await db.files.find_one({"id": file_id, "user_id": user["id"]})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    # remove from disk
    path = Path(f.get("storage_path", ""))
    if path.exists():
        try:
            path.unlink()
        except Exception:
            pass
    await db.files.delete_one({"id": file_id})
    # only decrement used if it was actually trashed (still counts until permanent delete)
    await db.users.update_one({"id": user["id"]}, {"$inc": {"storage_used": -int(f.get("size", 0))}})
    await log_activity(user["id"], "deleted", "file", f["name"], file_id)
    return {"ok": True}


@api.post("/files/{file_id}/share")
async def share_file(file_id: str, user: dict = Depends(get_current_user)):
    f = await db.files.find_one({"id": file_id, "user_id": user["id"]})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    token = f.get("share_token") or secrets.token_urlsafe(24)
    await db.files.update_one({"id": file_id}, {"$set": {"share_token": token}})
    await log_activity(user["id"], "shared", "file", f["name"], file_id)
    return {"share_token": token}


@api.get("/public/{share_token}")
async def public_file_meta(share_token: str):
    f = await db.files.find_one({"share_token": share_token, "trashed": False}, {"_id": 0, "storage_path": 0, "user_id": 0})
    if not f:
        raise HTTPException(status_code=404, detail="Not found")
    for k in ("created_at", "updated_at"):
        if isinstance(f.get(k), datetime):
            f[k] = f[k].isoformat()
    return f


@api.get("/public/{share_token}/content")
async def public_file_content(share_token: str):
    f = await db.files.find_one({"share_token": share_token, "trashed": False})
    if not f:
        raise HTTPException(status_code=404, detail="Not found")
    path = Path(f["storage_path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Content missing")

    def iter_file():
        with open(path, "rb") as fh:
            while True:
                chunk = fh.read(1024 * 1024)
                if not chunk:
                    break
                yield chunk

    return StreamingResponse(iter_file(), media_type=f.get("mime", "application/octet-stream"))


# ----------------------- Export Routes -----------------------
@api.get("/export/docx")
async def export_docx(title: str = "Vault Drive Report", user: dict = Depends(get_current_user)):
    files = await db.files.find({"user_id": user["id"], "trashed": False}, {"_id": 0, "storage_path": 0}).to_list(500)
    doc = DocxDocument()
    doc.add_heading(title, level=1)
    doc.add_paragraph(f"User: {user['email']}")
    doc.add_paragraph(f"Generated: {now_utc().isoformat()}")
    doc.add_paragraph(f"Total files: {len(files)}")
    doc.add_heading("Files", level=2)
    table = doc.add_table(rows=1, cols=4)
    hdr = table.rows[0].cells
    hdr[0].text = "Name"
    hdr[1].text = "Type"
    hdr[2].text = "Size (KB)"
    hdr[3].text = "Uploaded"
    for f in files:
        row = table.add_row().cells
        row[0].text = str(f.get("name", ""))
        row[1].text = str(f.get("kind", ""))
        row[2].text = f"{round(int(f.get('size', 0))/1024, 2)}"
        ca = f.get("created_at")
        row[3].text = ca.isoformat() if isinstance(ca, datetime) else str(ca or "")
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    await log_activity(user["id"], "exported", "report", "VaultDrive.docx")
    return StreamingResponse(
        iter([buf.read()]),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": 'attachment; filename="VaultDrive_Files.docx"'},
    )


@api.get("/export/xlsx")
async def export_xlsx(user: dict = Depends(get_current_user)):
    files = await db.files.find({"user_id": user["id"], "trashed": False}, {"_id": 0, "storage_path": 0}).to_list(500)
    wb = Workbook()
    ws = wb.active
    ws.title = "Files"
    ws.append(["Name", "Type", "Size (KB)", "Starred", "Uploaded"])
    for f in files:
        ca = f.get("created_at")
        ws.append([
            f.get("name", ""),
            f.get("kind", ""),
            round(int(f.get("size", 0)) / 1024, 2),
            "Yes" if f.get("starred") else "No",
            ca.isoformat() if isinstance(ca, datetime) else str(ca or ""),
        ])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    await log_activity(user["id"], "exported", "report", "VaultDrive.xlsx")
    return StreamingResponse(
        iter([buf.read()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="VaultDrive_Files.xlsx"'},
    )


# ----------------------- Stats / Activity -----------------------
@api.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    total_files = await db.files.count_documents({"user_id": user["id"], "trashed": False})
    total_folders = await db.folders.count_documents({"user_id": user["id"], "trashed": False})
    starred = await db.files.count_documents({"user_id": user["id"], "trashed": False, "starred": True})
    trashed = await db.files.count_documents({"user_id": user["id"], "trashed": True})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    used = fresh.get("storage_used", 0)
    quota = fresh.get("storage_quota", PLANS["free"]["storage_bytes"])
    pct = round((used / quota) * 100, 2) if quota else 0
    return {
        "total_files": total_files,
        "total_folders": total_folders,
        "starred": starred,
        "trashed": trashed,
        "storage_used": used,
        "storage_quota": quota,
        "storage_pct": pct,
    }


@api.get("/activity")
async def get_activity(limit: int = 50, user: dict = Depends(get_current_user)):
    items = await db.activity.find({"user_id": user["id"]}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    for it in items:
        if isinstance(it.get("timestamp"), datetime):
            it["timestamp"] = it["timestamp"].isoformat()
    return items


# ----------------------- Plans -----------------------
@api.get("/plans")
async def list_plans(user: dict = Depends(get_current_user)):
    return {"current": user.get("plan", "free"), "plans": list(PLANS.values())}


@api.post("/plans/upgrade")
async def upgrade_plan(body: UpgradeIn, user: dict = Depends(get_current_user)):
    if body.plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    plan = PLANS[body.plan_id]
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"plan": plan["id"], "storage_quota": plan["storage_bytes"]}},
    )
    await log_activity(user["id"], "upgraded", "plan", plan["name"])
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return user_public(fresh)


# ----------------------- Health -----------------------
@api.get("/")
async def root():
    return {"ok": True, "service": "Vault Drive API"}


# ----------------------- Startup -----------------------
@app.on_event("startup")
async def on_start():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.folders.create_index([("user_id", 1), ("parent_id", 1)])
    await db.folders.create_index("id", unique=True)
    await db.files.create_index([("user_id", 1), ("folder_id", 1)])
    await db.files.create_index("id", unique=True)
    await db.files.create_index("share_token")
    await db.activity.create_index([("user_id", 1), ("timestamp", -1)])

    # Seed admin user
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@vaultdrive.app").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid,
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_password),
            "plan": "premium_plus",
            "storage_used": 0,
            "storage_quota": PLANS["premium_plus"]["storage_bytes"],
            "created_at": now_utc(),
        })


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# Include router and CORS
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
