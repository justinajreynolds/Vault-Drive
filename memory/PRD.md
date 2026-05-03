# Vault Drive — PRD

## Product
Secure cloud storage app (Expo React Native + FastAPI + MongoDB), Google Drive-like UX, strict dark theme using user's VaultDrive palette.

## Core Features
- Email/password auth (JWT, bcrypt)
- Dashboard: greeting, storage stats, quick access, recent activity
- My Files with folder creation, nested browsing (breadcrumbs), grid/list toggle
- Upload via expo-document-picker (mobile) + file picker (web). Files stored on disk + metadata in Mongo.
- File actions: preview (image/PDF/video/audio), download, rename, star, share-link, trash
- Trash with restore + permanent delete
- Starred view
- Recent view (sorted by updated_at)
- Activity timeline (uploads, deletes, renames, restores, shares, star/unstar, plan upgrades, exports)
- Search across files
- Plans & Billing: Free 256GB / Pro 500GB / Premium 1TB / Premium+ 2TB (mocked upgrade)
- Profile screen with export to Word (docx), Excel (xlsx), Google Docs (docx compatible)
- Sidebar (persistent on wide screens, drawer on mobile)
- Public share links (token-based, unauthenticated content access)

## Palette (from user, enforced)
- #0B1F3A Deep Vault Blue (bg)
- #0F172A Dark Slate / Surface
- #2563EB Drive Blue (primary)
- #3B82F6 Sky Accent Blue (highlights)
- #FFFFFF / #F1F5F9 / #94A3B8

## Tech
- Backend: FastAPI + Motor (MongoDB), bcrypt, PyJWT, python-docx, openpyxl
- Frontend: Expo SDK 54, expo-router, AsyncStorage, expo-document-picker, @expo/vector-icons

## Monetization smart enhancement
- Prominent upgrade CTA in sidebar and a dedicated Plans screen matching user's "Most Popular" badge reference — designed to convert Free users to Pro via friction-free one-click mock upgrade (ready for Stripe drop-in).
