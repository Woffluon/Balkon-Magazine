# Supabase Database Setup and Usage Guide

This guide explains how to create and configure the Supabase database and storage used by this project, and how the code integrates with it. It is tailored to the codebase in this repository.

- Framework: Next.js 15 (App Router) with React 19 and TypeScript
- Backend: Supabase (Postgres, Auth, Storage)
- Admin panel: `/admin` (login required), public site: `/` and `/dergi/[sayi]`

Contents:
- Environment variables
- Database schema (tables, indexes, RLS policies)
- Storage bucket and policies
- Optional: Page records table
- Optional: Stricter admin model
- How the code uses Supabase
- Verification checklist

---

## 1) Environment Variables

Create a `.env.local` file at the repo root and set the following variables. These values can be found in your Supabase project dashboard:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Both the server and client Supabase clients use these variables:
- Server: `src/lib/supabase/server.ts`
- Client: `src/lib/supabase/client.ts`

> Note: Only anonymous key (public) is used by the frontend. Server-side privileged operations are still governed by Row-Level Security (RLS) policies.

---

## 2) Database Schema (SQL)

This project stores magazine metadata in the `public.magazines` table. Optionally, you can store individual page records in `public.magazine_pages` (the app currently reads pages from Storage, not from the table).

The SQL below is idempotent—safe to run multiple times.

```sql
-- Required extension for gen_random_uuid
create extension if not exists pgcrypto with schema public;

-- 2.1 magazines table
create table if not exists public.magazines (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  issue_number int not null,
  publication_date date not null,
  cover_image_url text,
  pdf_url text,
  page_count int,
  is_published boolean not null default false,
  constraint magazines_issue_number_unique unique (issue_number)
);

-- Helpful indexes
create index if not exists idx_magazines_issue_number on public.magazines(issue_number);
create index if not exists idx_magazines_is_published on public.magazines(is_published);
create index if not exists idx_magazines_created_at on public.magazines(created_at);

-- Enable RLS
alter table public.magazines enable row level security;

-- Policies
-- Anonymous visitors can read only published magazines
create policy if not exists "Anon can select published magazines"
  on public.magazines
  for select
  to anon
  using (is_published = true);

-- Authenticated users (admin panel) can do everything
create policy if not exists "Authenticated can full access magazines"
  on public.magazines
  for all
  to authenticated
  using (true)
  with check (true);
```

> Why this works: Public pages fetch only `is_published = true` rows. Admin actions run while authenticated (after login) and the policy permits full access.

---

## 3) Storage Bucket and Policies

Images are stored under a bucket called `magazines`. Structure:

- `<issue_number>/kapak.webp` — cover image (webp)
- `<issue_number>/pages/sayfa_001.webp` … `sayfa_00N.webp` — page images
- `logs/<issue>/<timestamp>.txt` — upload logs

Create the bucket and policies:

```sql
-- Create bucket (do once)
insert into storage.buckets (id, name, public)
values ('magazines', 'magazines', false)
on conflict (id) do nothing;

-- Allow anonymous reads (so public can see images)
create policy if not exists "Anon can read magazine images"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'magazines');

-- Allow authenticated users to fully manage objects (admin panel)
create policy if not exists "Authenticated can manage magazine images"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'magazines')
  with check (bucket_id = 'magazines');
```

> You can restrict write access further using path patterns (e.g., `name like '123/%'`) if you prefer per-issue scoping.

---

## 4) Optional: Page Records Table

The app currently lists page images from Storage in `src/app/dergi/[sayi]/page.tsx`. If you prefer keeping a DB record for each page (for ordering or extra metadata), create and use `magazine_pages`:

```sql
create table if not exists public.magazine_pages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  magazine_id uuid not null references public.magazines(id) on delete cascade,
  page_number int not null,
  image_url text not null
);

create index if not exists idx_magazine_pages_magazine_id on public.magazine_pages(magazine_id);
create unique index if not exists ux_magazine_pages_magazine_page on public.magazine_pages(magazine_id, page_number);

alter table public.magazine_pages enable row level security;

-- Anonymous users can read pages only for published magazines
define
create policy if not exists "Anon can read pages of published magazines"
  on public.magazine_pages
  for select
  to anon
  using (
    exists (
      select 1 from public.magazines m
      where m.id = magazine_pages.magazine_id
        and m.is_published = true
    )
  );

-- Authenticated users have full access (admin panel)
create policy if not exists "Authenticated can full access magazine_pages"
  on public.magazine_pages
  for all
  to authenticated
  using (true)
  with check (true);
```

If you adopt this, insert a row per uploaded page during the admin upload flow and fetch from DB instead of listing Storage.

---

## 5) Optional: Stricter Admin Model

Currently, any authenticated user can manage magazines and storage. For production, you may want to enforce an explicit admin list.

Common approaches:

- Admin emails table: Create `public.admin_emails(email text primary key)` and update policies with `exists (select 1 from admin_emails where email = auth.jwt()->>'email')`.
- Custom JWT claim: Manage a `role=admin` claim and check it in policies.
- Server-side service role: Restrict RLS to read-only and perform mutations via secure server endpoints with the service key (not exposed to the client).

This project uses a simple “authenticated = admin” model by default for ease of setup.

---

## 6) How the Code Uses Supabase

Key locations:

- `src/lib/supabase/server.ts`
  - Creates a server-side Supabase client and binds Next.js cookies.
- `src/lib/supabase/client.ts`
  - Creates a browser client for authenticated admin actions (uploading to Storage).
- `src/lib/magazines.ts`
  - `getPublishedMagazines()` fetches `is_published = true` magazines for the homepage.
- `src/app/dergi/[sayi]/page.tsx`
  - Fetches a magazine by `issue_number` and lists `magazines` bucket images from `/<issue>/pages` as the flipbook.
- `src/app/admin/login/actions.ts`
  - Implements email/password login with Supabase Auth.
- `src/app/admin/actions.ts`
  - Inserts/updates/deletes rows in `public.magazines`.
  - Moves/deletes Storage objects when renaming/deleting issues.
  - Writes upload logs to `magazines/logs/<issue>/...txt`.
- `src/app/admin/UploadDialog.tsx`
  - Client-side PDF -> images conversion and upload to Storage.
  - Calls server action to upsert the `magazines` row.

---

## 7) Verification Checklist

- Anonymous user
  - Home (`/`) shows only published magazines.
  - `/dergi/[sayi]` displays page images (public read).
- Authenticated user
  - `/admin/login` works; upon success, redirects to `/admin`.
  - Uploading creates/updates a `magazines` row and uploads images/logs to Storage.
  - Rename/Delete operations update DB and Storage correctly.
- RLS
  - Anonymous cannot insert/update/delete magazines or write to Storage.
  - Authenticated can manage `public.magazines` and Storage `magazines` bucket.

---

## Running the SQL

You can:

- Paste the SQL blocks into the Supabase SQL Editor and run them, or
- Use the Supabase CLI migrations system for versioning.

After applying the SQL and setting `.env.local`, run the app:

```bash
npm install
npm run dev
```

Then open http://localhost:3000.
