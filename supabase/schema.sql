create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  plan text not null default 'free',
  storage_limit_bytes bigint not null default 274877906944,
  created_at timestamptz not null default now()
);

create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_folder_id uuid references folders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  name text not null,
  type text not null,
  size bigint not null,
  storage_path text not null,
  file_url text,
  is_trashed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table folders enable row level security;
alter table files enable row level security;
alter table activity_logs enable row level security;

create policy "Profiles owner access" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Folders owner access" on folders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Files owner access" on files for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Activity owner access" on activity_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
