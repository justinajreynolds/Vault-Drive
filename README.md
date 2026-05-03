# Vault Drive MVP

This repo is now wired so you can connect it directly to **your Supabase account**.

## 1) Create Supabase project
1. Go to Supabase dashboard and create a project.
2. In **Project Settings → API**, copy:
   - `Project URL`
   - `anon public key`

## 2) Add environment variables
Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## 3) Run schema SQL
Open Supabase SQL editor and run `supabase/schema.sql`.

## 4) Create storage bucket
In Supabase Storage create bucket:
- `vault-drive` (private)

## 5) Enable Email auth
Supabase → Authentication → Providers → Email.

## 6) Start app
```bash
npm install
npm run dev
```

## Implemented MVP scope
- Supabase email/password signup/login/logout
- Protected `/app` route using middleware auth session check
- Dashboard + my files + recent + trash + activity + plans UI
- Folder/file action surfaces, trash restore button, export action buttons
- Dark-only VaultDrive theme
- Plan cards: Free 256GB, Pro 500GB, Premium 1TB, Premium+ 2TB

## Next production steps
- Replace mock file list with `files` + `folders` table queries
- Implement upload/download via Supabase Storage signed URLs
- Add RLS policies for strict user-level access
