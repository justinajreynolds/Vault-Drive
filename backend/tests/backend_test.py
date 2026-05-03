"""Vault Drive backend API tests. Uses public EXPO_PUBLIC_BACKEND_URL."""
import io
import os
import uuid
import pytest
import requests

# Load env
from dotenv import load_dotenv
load_dotenv("/app/frontend/.env")

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://cloud-vault-demo.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@vaultdrive.app"
ADMIN_PASSWORD = "Admin@12345"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return data["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def second_user():
    # register a secondary user for isolation tests
    email = f"test_iso_{uuid.uuid4().hex[:8]}@test.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "Iso User"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Health ----------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- Auth ----------
class TestAuth:
    def test_register_new_user(self):
        email = f"test_reg_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{API}/auth/register", json={"email": email.upper(), "password": "Passw0rd!", "name": "Reg"}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body
        assert body["user"]["email"] == email  # normalized to lowercase
        assert body["user"]["plan"] == "free"

    def test_register_duplicate(self):
        email = f"test_dup_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "A"}, timeout=15)
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "B"}, timeout=15)
        assert r.status_code == 400

    def test_login_success(self, admin_token):
        assert len(admin_token) > 20

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_me_with_token(self, admin_headers):
        r = requests.get(f"{API}/auth/me", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401


# ---------- Folders ----------
class TestFolders:
    def test_create_list_rename_delete_folder(self, admin_headers):
        name = f"TEST_Folder_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/folders", json={"name": name}, headers=admin_headers, timeout=10)
        assert r.status_code == 200, r.text
        folder = r.json()
        fid = folder["id"]
        assert folder["name"] == name
        assert folder["parent_id"] is None

        # list root
        r = requests.get(f"{API}/folders", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        ids = [f["id"] for f in r.json()]
        assert fid in ids

        # all=true
        r = requests.get(f"{API}/folders?all=true", headers=admin_headers, timeout=10)
        assert r.status_code == 200

        # rename
        r = requests.put(f"{API}/folders/{fid}", json={"name": name + "_renamed"}, headers=admin_headers, timeout=10)
        assert r.status_code == 200

        # delete (trash)
        r = requests.delete(f"{API}/folders/{fid}", headers=admin_headers, timeout=10)
        assert r.status_code == 200

        # verify not in active list
        r = requests.get(f"{API}/folders", headers=admin_headers, timeout=10)
        assert fid not in [f["id"] for f in r.json()]


# ---------- Files ----------
class TestFiles:
    @pytest.fixture(scope="class")
    def uploaded_file(self, admin_headers):
        content = b"Hello VaultDrive Test Content" * 20
        files = {"file": ("TEST_hello.txt", io.BytesIO(content), "text/plain")}
        r = requests.post(f"{API}/files/upload", files=files, headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        meta = r.json()
        assert meta["name"] == "TEST_hello.txt"
        assert meta["size"] == len(content)
        assert "_id" not in meta
        assert "storage_path" not in meta
        return meta

    def test_upload_and_list(self, admin_headers, uploaded_file):
        r = requests.get(f"{API}/files", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        ids = [f["id"] for f in r.json()]
        assert uploaded_file["id"] in ids

    def test_download(self, admin_headers, uploaded_file):
        r = requests.get(f"{API}/files/{uploaded_file['id']}/download", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert "attachment" in r.headers.get("content-disposition", "").lower()

    def test_star_toggle(self, admin_headers, uploaded_file):
        r = requests.post(f"{API}/files/{uploaded_file['id']}/star", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert r.json()["starred"] is True
        # starred filter
        r = requests.get(f"{API}/files?starred=true", headers=admin_headers, timeout=10)
        assert uploaded_file["id"] in [f["id"] for f in r.json()]

    def test_rename_file(self, admin_headers, uploaded_file):
        r = requests.put(f"{API}/files/{uploaded_file['id']}", json={"name": "TEST_renamed.txt"}, headers=admin_headers, timeout=10)
        assert r.status_code == 200

    def test_share_and_public_content(self, admin_headers, uploaded_file):
        r = requests.post(f"{API}/files/{uploaded_file['id']}/share", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        token = r.json()["share_token"]
        assert token
        # public (no auth)
        r = requests.get(f"{API}/public/{token}/content", timeout=15)
        assert r.status_code == 200
        assert len(r.content) > 0

    def test_search(self, admin_headers, uploaded_file):
        r = requests.get(f"{API}/files?search=TEST_renamed", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert any("TEST_renamed" in f["name"] for f in r.json())

    def test_trash_restore_permanent(self, admin_headers, uploaded_file):
        fid = uploaded_file["id"]
        r = requests.post(f"{API}/files/{fid}/trash", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        # present in trashed list
        r = requests.get(f"{API}/files?trashed=true", headers=admin_headers, timeout=10)
        assert fid in [f["id"] for f in r.json()]
        # restore
        r = requests.post(f"{API}/files/{fid}/restore", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        # permanent delete
        r = requests.delete(f"{API}/files/{fid}/permanent", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        # verify gone
        r = requests.get(f"{API}/files/{fid}", headers=admin_headers, timeout=10)
        assert r.status_code == 404


# ---------- Stats / Activity ----------
class TestStatsActivity:
    def test_stats(self, admin_headers):
        r = requests.get(f"{API}/stats", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        data = r.json()
        for k in ("total_files", "total_folders", "starred", "trashed", "storage_used", "storage_quota", "storage_pct"):
            assert k in data

    def test_activity(self, admin_headers):
        r = requests.get(f"{API}/activity?limit=10", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        for it in items:
            assert "_id" not in it
            assert isinstance(it.get("timestamp"), str)


# ---------- Plans ----------
class TestPlans:
    def test_get_plans(self, admin_headers):
        r = requests.get(f"{API}/plans", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "current" in data and "plans" in data
        ids = [p["id"] for p in data["plans"]]
        for p in ("free", "pro", "premium", "premium_plus"):
            assert p in ids

    def test_upgrade_plan(self, second_user):
        token = second_user["token"]
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.post(f"{API}/plans/upgrade", json={"plan_id": "pro"}, headers=headers, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["plan"] == "pro"
        assert data["storage_quota"] == 500 * 1024 ** 3

    def test_invalid_plan(self, admin_headers):
        r = requests.post(f"{API}/plans/upgrade", json={"plan_id": "nonsense"}, headers=admin_headers, timeout=10)
        assert r.status_code == 400


# ---------- Export ----------
class TestExport:
    def test_export_docx(self, admin_headers):
        r = requests.get(f"{API}/export/docx", headers=admin_headers, timeout=20)
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "officedocument.wordprocessingml" in ct
        assert r.content[:2] == b"PK"  # zip magic

    def test_export_xlsx(self, admin_headers):
        r = requests.get(f"{API}/export/xlsx", headers=admin_headers, timeout=20)
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "spreadsheetml" in ct
        assert r.content[:2] == b"PK"


# ---------- Isolation ----------
class TestIsolation:
    def test_user_a_cannot_access_user_b_file(self, admin_headers, second_user):
        # upload file as second user
        token = second_user["token"]
        h = {"Authorization": f"Bearer {token}"}
        files = {"file": ("iso.txt", io.BytesIO(b"secret"), "text/plain")}
        r = requests.post(f"{API}/files/upload", files=files, headers=h, timeout=15)
        assert r.status_code == 200
        fid = r.json()["id"]
        # admin tries to access
        r = requests.get(f"{API}/files/{fid}", headers=admin_headers, timeout=10)
        assert r.status_code == 404
        r = requests.delete(f"{API}/files/{fid}/permanent", headers=admin_headers, timeout=10)
        assert r.status_code == 404
