# Supabase Database Setup and Usage Guide

This guide explains how to create and configure the Supabase database and storage used by this project, and how the code integrates with it. It is tailored to the codebase in this repository.

- Framework: Next.js 15 (App Router) with React 19 and TypeScript
- Backend: Supabase (Postgres, Auth, Storage)
- Admin panel: `/admin` (login required), public site: `/` and `/dergi/[sayi]`

**Implementation Files (DO NOT DELETE):**
- `src/lib/supabase/client.ts` - Browser client for client-side operations
- `src/lib/supabase/server.ts` - Server clients (public, authenticated, with cookies)
- `middleware.ts` - Authentication middleware with session refresh
- `src/lib/env.ts` - Environment variable validation

**About This Document:**
This comprehensive guide contains all the information you need to understand and work with Supabase in this project. It includes:
- Complete code implementations with explanations
- Database setup SQL scripts
- Usage patterns and best practices
- Troubleshooting solutions

You should not need to reference the individual implementation files unless you're modifying the core Supabase integration. Everything is documented here with full code examples.

**Contents:**
1. [Environment Variables](#1-environment-variables) - Configuration and validation
2. [Database Schema](#2-database-schema-sql) - Tables, indexes, and RLS policies
3. [Storage Bucket](#3-storage-bucket-and-policies) - File storage configuration
4. [Optional: Page Records Table](#4-optional-page-records-table) - Alternative page storage
5. [Optional: Stricter Admin Model](#5-optional-stricter-admin-model) - Enhanced security
6. [How the Code Uses Supabase](#6-how-the-code-uses-supabase) - Implementation details
7. [Complete Implementation Reference](#7-complete-implementation-reference) - Client selection guide
8. [Verification Checklist](#8-verification-checklist) - Testing your setup
9. [Running the SQL](#9-running-the-sql) - Setup instructions
10. [Troubleshooting](#10-troubleshooting) - Common issues and solutions
11. [Monitoring and Alerts](#11-monitoring-and-alerts) - Sentry error tracking

**Quick Start:**
1. Set up `.env.local` with Supabase credentials
2. Run the SQL from section 2 (Database Schema) and section 3 (Storage Bucket)
3. Configure JWT expiry to 3600 seconds in Supabase dashboard
4. Run `npm install && npm run dev`
5. Test with the verification checklist (section 8)

---

## 1) Environment Variables

Create a `.env.local` file at the repo root and set the following variables. These values can be found in your Supabase project dashboard:

```bash
# Required Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional Configuration
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_GOOGLE_VERIFICATION=your_google_verification_code
NEXT_PUBLIC_PDFJS_WORKER_URL=/pdf.worker.min.mjs
```

### Environment Variable Validation

The application validates all environment variables at startup using Zod schemas (`src/lib/env.ts`). This ensures:
- Type safety across the application
- Early detection of configuration errors
- Clear error messages for missing or invalid variables

If validation fails, the application will throw a detailed error message indicating which variables are missing or invalid.

### JWT Expiry Configuration

For optimal session management and security, configure the JWT expiry in your Supabase dashboard:

1. Go to **Settings** > **Auth** in your Supabase project dashboard
2. Set **JWT Expiry** to `3600` seconds (1 hour)

The middleware automatically refreshes sessions when they are within 5 minutes of expiration, ensuring users don't experience unexpected logouts during active use.

---

## 2) Database Schema (SQL)

This project stores magazine metadata in the `public.magazines` table. Optionally, you can store individual page records in `public.magazine_pages` (the app currently reads pages from Storage, not from the table).

### Quick Setup (Basic)

For a basic setup without role-based access control, use this SQL (idempotent—safe to run multiple times):

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

### Production Setup (Recommended)

For production environments with proper role-based access control, use the migration system:

**See `supabase/migrations/` directory for:**
- `20241120000000_enable_rls_and_create_policies.sql` - Complete RLS setup with user roles
- `README.md` - Migration documentation
- `DEPLOYMENT_GUIDE.md` - Step-by-step deployment instructions

The production migration provides:
- `user_profiles` table for role management (admin/user)
- Proper RLS policies that verify admin role from database
- Automatic profile creation for new users
- Enhanced security with principle of least privilege

**To apply the production migration:**
1. Follow the instructions in `supabase/DEPLOYMENT_GUIDE.md`
2. Update at least one user to have admin role
3. The application code is already configured to use the role-based system

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

### Supabase Client Implementation

The application uses three different Supabase client configurations depending on the context:

#### Client-Side Browser Client (`src/lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

/**
 * Creates a Supabase client for browser/client-side usage
 * Used in React components for authenticated operations
 */
export function createClient(): SupabaseClient {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
```

**Usage:** Admin panel file uploads, client-side authenticated operations

#### Server-Side Clients (`src/lib/supabase/server.ts`)

The server module provides three client creation functions:

**1. Public Client (No Cookies)**
```typescript
/**
 * Creates a simple Supabase client for public data access without cookies
 * Use this for cached operations that don't require authentication
 */
export function createPublicClient(): SupabaseClient {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
```

**Usage:** Cached public data fetching (homepage magazines list)

**2. Server Client (With Cookies)**
```typescript
/**
 * Creates a Supabase client for server-side usage with cookie management
 * Handles session state across requests
 */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Ignore errors in read-only contexts
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Ignore errors in read-only contexts
          }
        },
      },
    }
  )
}
```

**Usage:** Server actions, API routes, server components that need session

**3. Authenticated Client (With Auth Check)**
```typescript
/**
 * Creates a Supabase client with authentication check
 * Redirects to /admin/login if user is not authenticated
 */
export async function getAuthenticatedClient(): Promise<SupabaseClient> {
  const supabase = await createClient()
  
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    redirect('/admin/login')
  }
  
  return supabase
}
```

**Usage:** Protected admin routes and server actions

### Authentication Middleware (`middleware.ts`)

The root middleware handles authentication and session management for all `/admin` routes:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl

  // Automatic session refresh (within 5 minutes of expiration)
  if (session?.expires_at) {
    const now = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = session.expires_at - now
    const fiveMinutes = 5 * 60
    
    if (timeUntilExpiry < fiveMinutes && timeUntilExpiry > 0) {
      await supabase.auth.refreshSession()
    }
  }

  // Redirect logic
  if (!session && pathname.startsWith('/admin') && pathname !== '/admin/login') {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (session && pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

**Features:**
- Automatic session refresh when within 5 minutes of expiration
- Redirects unauthenticated users to login page
- Redirects authenticated users away from login page
- Cookie management for session persistence

### Key Application Locations

- **`src/lib/magazines.ts`**
  - `getPublishedMagazines()` fetches `is_published = true` magazines for the homepage
  - Uses `createPublicClient()` for cached public data

- **`src/app/dergi/[sayi]/page.tsx`**
  - Fetches a magazine by `issue_number`
  - Lists `magazines` bucket images from `/<issue>/pages` as the flipbook

- **`src/app/admin/login/actions.ts`**
  - Implements email/password login with Supabase Auth
  - Uses server client with cookie management

- **`src/app/admin/actions.ts`**
  - Inserts/updates/deletes rows in `public.magazines`
  - Moves/deletes Storage objects when renaming/deleting issues
  - Writes upload logs to `magazines/logs/<issue>/...txt`
  - Uses `getAuthenticatedClient()` for protected operations

- **`src/app/admin/UploadDialog.tsx`**
  - Client-side PDF → images conversion and upload to Storage
  - Uses browser client for file uploads
  - Calls server action to upsert the `magazines` row

---

## 7) Complete Implementation Reference

### When to Use Each Client

| Client Type | Function | Use Case | Authentication |
|------------|----------|----------|----------------|
| Browser Client | `createClient()` from `client.ts` | Client-side uploads, authenticated UI operations | Required |
| Public Client | `createPublicClient()` from `server.ts` | Cached public data, no session needed | Not required |
| Server Client | `createClient()` from `server.ts` | Server actions, API routes with session | Optional |
| Authenticated Client | `getAuthenticatedClient()` from `server.ts` | Protected admin operations | Required (redirects if missing) |

### Client Selection Guide

```typescript
// ✅ For public cached data (homepage)
import { createPublicClient } from '@/lib/supabase/server'
const supabase = createPublicClient()
const { data } = await supabase.from('magazines').select('*').eq('is_published', true)

// ✅ For server actions that need session
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data: { session } } = await supabase.auth.getSession()

// ✅ For protected admin operations (auto-redirects if not authenticated)
import { getAuthenticatedClient } from '@/lib/supabase/server'
const supabase = await getAuthenticatedClient()
await supabase.from('magazines').insert({ ... })

// ✅ For client-side file uploads
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
await supabase.storage.from('magazines').upload(path, file)
```

### Environment Variable Access

Always import validated environment variables from `@/lib/env`:

```typescript
import { env } from '@/lib/env'

// ✅ Type-safe and validated
const url = env.NEXT_PUBLIC_SUPABASE_URL

// ❌ Don't access process.env directly
const url = process.env.NEXT_PUBLIC_SUPABASE_URL // Not type-safe
```

### Session Management Flow

1. **User logs in** → `src/app/admin/login/actions.ts`
   - Calls `supabase.auth.signInWithPassword()`
   - Session stored in cookies

2. **User navigates to /admin** → `middleware.ts`
   - Checks session validity
   - Refreshes if within 5 minutes of expiration
   - Redirects to login if no session

3. **User performs admin action** → `src/app/admin/actions.ts`
   - Uses `getAuthenticatedClient()` which verifies session
   - Performs database/storage operations
   - RLS policies enforce permissions

4. **Session expires** → `middleware.ts`
   - Automatic refresh attempt
   - Redirect to login if refresh fails

### Error Handling

All Supabase clients handle errors gracefully:

```typescript
// Server client ignores cookie errors in read-only contexts
set(name: string, value: string, options: CookieOptions) {
  try {
    cookieStore.set({ name, value, ...options })
  } catch {
    // Ignore errors in read-only contexts (e.g., static generation)
  }
}
```

### Security Best Practices

1. **Never expose service role key** - Only use anon key in client code
2. **Rely on RLS policies** - All data access is governed by database policies
3. **Use authenticated client** - For admin operations, always use `getAuthenticatedClient()`
4. **Validate environment** - Application validates all env vars at startup
5. **Session refresh** - Middleware automatically refreshes expiring sessions

---

## 8) Verification Checklist

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

## 9) Running the SQL

You can:

- Paste the SQL blocks into the Supabase SQL Editor and run them, or
- Use the Supabase CLI migrations system for versioning.

After applying the SQL and setting `.env.local`, run the app:

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

---

## 10) Troubleshooting

### Environment Variable Errors

**Error:** `Environment variable validation failed`

**Solution:** Check your `.env.local` file:
```bash
# Ensure these are set correctly
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Authentication Issues

**Problem:** Redirected to login repeatedly

**Solutions:**
1. Check JWT expiry is set to 3600 seconds in Supabase dashboard
2. Clear browser cookies and try again
3. Verify RLS policies allow authenticated users
4. Check middleware is not blocking the route

**Problem:** Session expires too quickly

**Solution:** Ensure JWT expiry is configured to 1 hour (3600 seconds) in Supabase Auth settings

### Storage Access Issues

**Problem:** Cannot view images on public pages

**Solution:** Verify storage policy allows anonymous reads:
```sql
create policy if not exists "Anon can read magazine images"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'magazines');
```

**Problem:** Cannot upload files in admin panel

**Solution:** 
1. Verify you're logged in
2. Check storage policy allows authenticated writes
3. Ensure bucket exists: `magazines`

### Database Access Issues

**Problem:** Cannot see published magazines on homepage

**Solution:** Verify RLS policy:
```sql
create policy if not exists "Anon can select published magazines"
  on public.magazines
  for select
  to anon
  using (is_published = true);
```

**Problem:** Admin cannot create/update magazines

**Solution:** 
1. Verify you're authenticated
2. Check RLS policy allows authenticated full access
3. For production setup, verify user has admin role in `user_profiles` table

### Client Selection Issues

**Problem:** "Cannot read cookies in static generation"

**Solution:** Use `createPublicClient()` instead of `createClient()` for cached/static data:
```typescript
// ✅ For cached public data
import { createPublicClient } from '@/lib/supabase/server'
const supabase = createPublicClient()

// ❌ Don't use cookie-based client for static data
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient() // May fail in static contexts
```

### Migration Issues

**Problem:** Migration fails to apply

**Solution:**
1. Check SQL syntax in migration file
2. Verify you have necessary permissions
3. Run migrations in order (check version numbers)
4. Use Supabase SQL Editor to run manually if needed

### Common Gotchas

1. **Anon key vs Service key:** Never use service role key in client code
2. **RLS must be enabled:** All tables need RLS enabled for security
3. **Cookie errors are normal:** Server client ignores cookie errors in read-only contexts
4. **Session refresh timing:** Middleware refreshes 5 minutes before expiration
5. **Public client for caching:** Use `createPublicClient()` for `unstable_cache` operations

---

## 11) Monitoring and Alerts

The application includes comprehensive error tracking and monitoring using Sentry. This helps identify and resolve issues quickly in production.

### Sentry Integration

Sentry is configured for:
- Client-side error tracking
- Server-side error tracking
- Edge runtime error tracking
- Performance monitoring
- Session replay for debugging

**Configuration files:**
- `sentry.client.config.ts` - Browser error tracking
- `sentry.server.config.ts` - Server error tracking
- `sentry.edge.config.ts` - Edge runtime tracking

### Alert Configuration

The platform includes pre-configured alert rules for:

1. **Critical Errors** - Immediate notification for fatal errors
2. **High Error Rate** - Alert when errors exceed 10/minute
3. **Performance Degradation** - Alert when P95 response time > 5s
4. **User-Impacting Errors** - Alert when 5+ users affected
5. **Database Issues** - Alert for connection failures
6. **Storage Issues** - Alert for quota or upload failures
7. **Authentication Issues** - Alert for high failure rates

### Setup Instructions

**Quick Start:**
1. Review [Sentry Alert Configuration Guide](./SENTRY_ALERTS.md)
2. Follow [Sentry Setup Checklist](./SENTRY_SETUP_CHECKLIST.md)
3. Configure alerts using [sentry-alerts.config.json](../sentry-alerts.config.json)
4. Test alerts with `npm run test-alerts`

**Documentation:**
- [SENTRY_ALERTS.md](./SENTRY_ALERTS.md) - Comprehensive alert configuration guide
- [SENTRY_SETUP_CHECKLIST.md](./SENTRY_SETUP_CHECKLIST.md) - Step-by-step setup checklist
- [sentry-alerts.config.json](../sentry-alerts.config.json) - Alert configuration reference
- [scripts/test-sentry-alerts.ts](../scripts/test-sentry-alerts.ts) - Alert testing script

### Testing Alerts

Test your alert configuration:

```bash
# Test all alerts
npm run test-alerts -- --type=all

# Test specific alert types
npm run test-alerts -- --type=critical
npm run test-alerts -- --type=error-rate
npm run test-alerts -- --type=performance
```

### Environment Variables for Sentry

Add to your `.env.local`:

```bash
# Sentry Configuration (Production)
SENTRY_DSN=your-server-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=your-client-sentry-dsn
```

**Note:** Sentry is only active in production. Development and staging environments use console logging.

### Monitoring Best Practices

1. **Regular Review:** Check Sentry dashboard weekly for error trends
2. **Alert Tuning:** Adjust thresholds based on actual traffic patterns
3. **PII Protection:** All sensitive data is automatically scrubbed before sending to Sentry
4. **Performance Tracking:** Monitor P95 response times for degradation
5. **User Impact:** Prioritize errors affecting multiple users

For detailed information on error handling and logging, see the [Error Handling Specification](.kiro/specs/error-handling-logging/).
