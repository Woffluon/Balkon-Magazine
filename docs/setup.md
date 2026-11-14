# Setup and Deployment

## Prerequisites

- **Node.js**: `>=18.0.0 <=22.x` (defined in `package.json` `engines.node`)
- **pnpm**: `10.5.2` (`packageManager: "pnpm@10.5.2"`)
- **Supabase Project**: PostgreSQL database, Supabase Auth, and Supabase Storage (required even when storing magazine assets in R2)
- **Cloudflare R2 Bucket** (optional): required only when `NEXT_PUBLIC_STORAGE_PROVIDER=r2`
- **Sentry Project** (optional): used in production builds for error and performance reporting

## Installation

```bash
git clone https://github.com/Woffluon/Balkon-Magazine.git
cd Balkon-Magazine
pnpm install
cp .env.example .env.local
```

Running `pnpm install` triggers `postinstall` (`node scripts/copy-pdf-worker.mjs`), which copies `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` to `public/pdf.worker.min.mjs` and prints its SHA-256 digest.

## Environment Variables

Client and public configuration is validated by Zod in `src/lib/env.ts` (and mirrored in `src/lib/config/env.ts`). Server-only secrets are validated on demand by `src/lib/config/serverEnv.ts`.

| Variable | Scope | Required | Default | Purpose |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes | — | Supabase project URL (`env.ts`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Yes | — | Supabase anonymous key (`env.ts`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Yes | — | Privileged Supabase service role key (`serverEnv.ts`) |
| `NEXT_PUBLIC_STORAGE_PROVIDER` | Public | No | `supabase` | Asset storage backend: `supabase` or `r2` |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Public | No | — | Public R2/CDN URL added to CSP `connect-src` |
| `R2_ACCESS_KEY_ID` | Server | When `r2` | — | Cloudflare R2 S3 access key ID |
| `R2_SECRET_ACCESS_KEY` | Server | When `r2` | — | Cloudflare R2 S3 secret access key |
| `R2_ACCOUNT_ID` | Server | When `r2` | — | Cloudflare account ID for R2 endpoint |
| `R2_BUCKET_NAME` | Server | When `r2` | — | Cloudflare R2 bucket name |
| `R2_ALLOWED_ORIGINS` | CLI script | No | `https://balkondergi.com` | Comma-separated CORS origins for `configure-r2-cors.ts` |
| `NODE_ENV` | Both | No | `development` | `development`, `production`, or `test` |
| `NEXT_PUBLIC_SITE_URL` | Public | No | — | Canonical base URL for metadata, sitemap, and OG tags |
| `NEXT_PUBLIC_PDFJS_WORKER_URL` | Public | No | `/pdf.worker.min.mjs` | Path or URL for the PDF.js worker script |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Public | No | — | Google Search Console verification token |
| `SENTRY_DSN` | Server/Edge | No | — | Sentry DSN for `sentry.server.config.ts` and `sentry.edge.config.ts` |
| `NEXT_PUBLIC_SENTRY_DSN` | Public | No | — | Sentry DSN for `sentry.client.config.ts` |
| `ANALYZE` | Build | No | — | Set to `true`, `client`, or `server` to run `@next/bundle-analyzer` |
| `ENABLE_VALIDATION` | Server/Build | No | — | Set to `true` to keep `ValidationSystem.isEnabled()` active in production |

> **Note on `.env.example`:** `NEXT_PUBLIC_GOOGLE_VERIFICATION`, `R2_ALLOWED_ORIGINS`, `ANALYZE`, and `ENABLE_VALIDATION` are not listed in `.env.example`. `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` are read directly from `process.env` in `sentry.*.config.ts` and are not part of the Zod schemas in `env.ts` or `serverEnv.ts`.

## Supabase Setup

1. Open the Supabase SQL Editor and run the migration scripts in order:
   1. `src/migration/database_setup.sql`
      - Enables `pgcrypto` and creates `public.magazines`, `public.user_profiles`, `public.magazine_pages` (optional), and `public.magazine_views`.
      - Creates `current_user_is_admin()`, `increment_magazine_view()`, `get_advanced_analytics()`, and the `on_auth_user_created` trigger (`handle_new_user()`), which assigns `role = 'user'` to new Auth users.
      - Creates two storage buckets:
        - `magazines` (`public = TRUE`) — anonymous `SELECT` restricted to `^[0-9]+/(kapak\.webp|pages/sayfa_[0-9]{3}\.webp)$`; admin `FOR ALL`.
        - `magazine-upload-logs` (`public = FALSE`) — admin `FOR ALL`.
   2. `src/migration/page_engagement.sql`
      - Creates `public.page_engagement`, public `INSERT` and admin `SELECT` RLS policies, and the `get_page_analytics(UUID, INT)` RPC.
   3. `src/migration/performance_metrics.sql`
      - Creates `public.performance_metrics` with public `INSERT` (`anon`, `authenticated`) and `SELECT` (`authenticated`) policies. Note that the `SELECT` policy currently uses `USING (true)` for any authenticated user.

2. Grant admin access to at least one user:
   - Create a user in **Supabase Auth -> Users** (the trigger creates a `user_profiles` row with `role = 'user'`).
   - Promote that user in SQL:
     ```sql
     UPDATE public.user_profiles
     SET role = 'admin'
     WHERE user_id = '<auth-user-uuid>';
     ```

## Cloudflare R2 Setup

To store magazine covers and pages on Cloudflare R2 instead of Supabase Storage:

1. Set `NEXT_PUBLIC_STORAGE_PROVIDER=r2`, `NEXT_PUBLIC_R2_PUBLIC_URL`, and the four `R2_*` server variables (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`).
2. Configure CORS on the R2 bucket so browser clients can fetch images with `GET`/`HEAD` and `Range`/`Content-Type` headers. Because `configure-r2-cors.ts` reads `process.env` directly without loading `.env.local`, export the R2 variables in your shell first:

   ```bash
   export R2_ACCESS_KEY_ID=...
   export R2_SECRET_ACCESS_KEY=...
   export R2_ACCOUNT_ID=...
   export R2_BUCKET_NAME=...
   export R2_ALLOWED_ORIGINS="https://balkondergi.com,http://localhost:3000"
   pnpm configure:r2-cors
   ```

   This applies `AllowedMethods: ["GET", "HEAD"]`, `AllowedHeaders: ["Range", "Content-Type"]`, `ExposeHeaders: ["ETag", "Content-Type", "Content-Length"]`, and `MaxAgeSeconds: 3600`.

## Available Scripts

All scripts are defined in `package.json`:

| Command | Underlying Command | Description |
|---|---|---|
| `pnpm dev` | `next dev --turbopack` | Start local development server with Turbopack |
| `pnpm build` | `next build` | Create production Next.js build |
| `pnpm start` | `next start` | Start production Next.js server |
| `pnpm lint` | `eslint` | Run ESLint (`next/core-web-vitals`, `next/typescript`) |
| `pnpm type-check` | `tsc --noEmit` | Run TypeScript type checking |
| `pnpm test` | `npx tsx --test src/lib/utils/__tests__/*.test.ts src/lib/audio/__tests__/*.test.ts` | Run unit tests |
| `pnpm clean` | `rm -rf .next` | Delete `.next` build output (POSIX shells; see [Troubleshooting](#troubleshooting) on Windows) |
| `pnpm configure:r2-cors` | `tsx configure-r2-cors.ts` | Apply CORS rules to the configured Cloudflare R2 bucket |
| `pnpm postinstall` | `node scripts/copy-pdf-worker.mjs` | Copy `pdf.worker.min.mjs` from `pdfjs-dist` into `public/` |
| `pnpm analyze` | `cross-env ANALYZE=true pnpm build` | Build with `@next/bundle-analyzer` enabled for client and server |
| `pnpm analyze:server` | `cross-env ANALYZE=server pnpm build` | Build with server bundle analyzer |
| `pnpm analyze:client` | `cross-env ANALYZE=client pnpm build` | Build with client bundle analyzer |

Additionally, `scripts/generate-page-flip-sound.mjs` uses `ffmpeg` to synthesize `.wav` and `.mp3` flip audio assets; the runtime reader ships and loads `public/sounds/page-flip.opus`.

## Sentry Monitoring

`sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` initialize Sentry only when `NODE_ENV === 'production'`.

- **Sampling**: `tracesSampleRate: 0.1`; client Session Replay uses `replaysOnErrorSampleRate: 1.0` and `replaysSessionSampleRate: 0.1` with `maskAllText: true` and `blockAllMedia: true`.
- **PII Scrubbing**: `beforeSend` strips cookies, redacts sensitive query parameters and email patterns, and sanitizes nested fields.
- **Alert Rules**: `sentry-alerts.config.json` contains 11 alert rule definitions for the `balkon-dergisi` project.

## Deployment

Key production settings in `next.config.ts`:

- `output: 'standalone'` is enabled only when `NODE_ENV === 'production'` and `process.platform !== 'win32'`.
- `experimental.serverActions.bodySizeLimit: '500mb'` supports large PDF/WebP Server Action payloads.
- `images: { unoptimized: true }` bypasses Next.js image optimization for static object URLs.
- `compiler.removeConsole: { exclude: ['error', 'warn'] }` strips debug logs in production.
- `compress: true` and `poweredByHeader: false`.

### Vercel

1. Connect the repository in Vercel.
2. Add all required environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus optional R2, `NEXT_PUBLIC_SITE_URL`, and Sentry variables).
3. Deploy. Vercel runs `pnpm install` (triggering `postinstall` to copy `public/pdf.worker.min.mjs`) and `pnpm build`.

### Self-Hosting

1. Export required build-time environment variables (`next.config.ts` imports `src/lib/env.ts`, which requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` during `pnpm build`).
2. Run `pnpm build`.
3. Start the server with `pnpm start` (or run the `.next/standalone` bundle on non-Windows hosts).
4. Verify `/pdf.worker.min.mjs` returns `200 OK` after deployment.

## Troubleshooting

- **`pnpm type-check` fails referencing deleted routes in `.next/types/validator.ts`**: Stale generated Next.js types in `.next/` remain after route deletions. Remove `.next` and regenerate types via `pnpm build` (or run `npx next typegen` if supported by your Next version) before re-running `pnpm type-check`.
- **`pnpm clean` fails on Windows**: `package.json` runs `rm -rf .next`. In PowerShell, run `Remove-Item -Recurse -Force .next`.
- **PDF upload fails to load worker**: Run `node scripts/copy-pdf-worker.mjs` and confirm `public/pdf.worker.min.mjs` matches the installed `pdfjs-dist` version.
- **R2 CORS errors in browser**: Ensure `R2_ALLOWED_ORIGINS` includes the exact origin (`https://...` or `http://localhost:3000`), export R2 credentials in the shell, and re-run `pnpm configure:r2-cors`.
- **Admin user redirected or denied on `/admin`**: Verify the user's row in `public.user_profiles` has `role = 'admin'`.
