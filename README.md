# Vault Drive MVP

Vault Drive is a dark-mode-first cloud storage SaaS MVP built with **Next.js + Supabase**.

## Features implemented

- Authentication-ready login/signup shell
- Dashboard, My Files, Recent, Trash, Activity, Plans pages
- Search UI, upload CTA, file cards, and per-file actions
- Folder browsing surface
- Trash restore CTA
- Activity timeline
- Export actions (Word, Google Docs, Excel)
- Pricing plans:
  - Free: 256GB
  - Pro: 500GB
  - Premium: 1TB
  - Premium+: 2TB

## Stack

- Next.js 14 (App Router)
- React 18
- Supabase client setup
- CSS custom theme using VaultDrive palette

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Run locally

```bash
npm install
npm run dev
```

## Suggested Supabase schema

See `supabase/schema.sql`.
