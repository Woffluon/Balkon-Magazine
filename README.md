<div align="center">

<img src="public/favicon.png" alt="Balkon Dergisi" width="96" height="96" />

# 📖 Balkon Dergisi

**Modern Digital Magazine Platform for Sezai Karakoç Anadolu Lisesi**

*"Şu içimizin de balkonu olsaydı, çıkıp arada nefes alsaydık."*

[![Next.js](https://img.shields.io/badge/Next.js-15.5.7-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=flat&logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[Features](#-features) • [Architecture](#-architecture) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Deployment](#-deployment) • [Analytics](#-analytics-dashboard)

</div>

---

![Interactive Flipbook Experience](public/hero_image.webp)
<p align="center"><em>Interactive Flipbook Experience</em></p>

---

## 🌟 Overview

**Balkon Dergisi** is a production-grade digital magazine platform that transforms PDF publications into immersive, interactive reading experiences. Built for **Sezai Karakoç Anadolu Lisesi**, it combines enterprise-level engineering with student publication accessibility.

The name "Balkon" (Turkish for "Balcony") embodies the platform's philosophy—providing students a space to breathe, express themselves, and share their creative work with the world.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **📚 Interactive Flipbook Reader** | Hardware-accelerated page-turning with zoom, keyboard navigation, and touch gestures |
| **📄 PDF-to-Magazine Pipeline** | Automated PDF processing with page extraction, WebP conversion, and parallel uploads |
| **🔐 Admin Dashboard** | Complete CRUD operations with optimistic locking, transaction rollback, and audit trails |
| **📊 Analytics Engine** | Session-based reader analytics with device tracking and engagement metrics |
| **🛡️ Production Security** | CSP headers, rate limiting, input sanitization, and Sentry error monitoring |

---

## 🎯 Features

### 🎨 Interactive Reader Experience

Built on [`FlipbookViewer`](./src/components/FlipbookViewer.tsx), the reading interface delivers magazine-quality interactions:

- **Page Flip Animation** powered by [react-pageflip](https://github.com/Nodlik/StPageFlip) with smooth 60fps transitions
- **Zoom Controls** (1x → 4x scale) via [`ZoomContainer`](./src/components/reader/ZoomContainer.tsx) with pinch-to-zoom support
- **Page Lock Feature** prevents accidental navigation during zoomed reading
- **Keyboard Navigation** (Arrow keys, Space, Escape) with accessibility aria-live announcements
- **Intelligent Preloading** — Adjacent pages prefetch for instant flips
- **Responsive Dimensions** using [`useResponsiveDimensions`](./src/hooks/useResponsiveDimensions.ts) for dynamic viewport scaling

### 🔄 PDF Processing Pipeline

Enterprise-grade PDF processing with comprehensive error recovery:

```
PDF File → Page Extraction → WebP Conversion → Parallel Upload → Database Record
    ↓            ↓                 ↓                 ↓               ↓
 Validation   pdf.js          Canvas API      Batch (3 concurrent)  Transaction
 Magic bytes  Worker          quality=0.85    Retry (3 attempts)    Rollback
```

**Key Technical Details:**
- PDF parsing via [pdf.js](https://mozilla.github.io/pdf.js/) with dedicated web worker
- Page rendering to OffscreenCanvas with configurable target height (2000px default)
- WebP encoding at 85% quality for optimal size/quality balance
- Batched parallel uploads (3 concurrent) with exponential backoff retry
- Wake Lock API integration to prevent device sleep during long uploads
- Full transaction support: storage uploads roll back if database insert fails

### 📊 Analytics & Insights

Real-time analytics powered by [Supabase](https://supabase.com/) with [`AnalyticsService`](./src/lib/services/AnalyticsService.ts):

- **Session Tracking** — Device type, user agent, start time, duration
- **Event Buffering** — Batched writes (5 events or 10s interval) for performance
- **Graceful Degradation** — Fallback IDs when database is unavailable
- **Analytics Dashboard** at [`/admin/analytics`](./src/app/(admin)/admin/analytics) with:
  - 📈 Total sessions, unique users, average duration metrics
  - 📱 Device distribution (mobile/tablet/desktop) pie charts
  - 📆 Daily session trends via [Recharts](https://recharts.org/)

### 🔐 Authentication & Authorization

Secure admin access via [Supabase Auth](https://supabase.com/docs/guides/auth) with SSR-compatible session management:

- **Middleware Protection** ([`middleware.ts`](./middleware.ts)) — Route guards for `/admin` paths
- **Auto-Refresh Sessions** — Proactive token renewal within 5 minutes of expiry
- **Role-Based Access** — Admin-only upload and magazine management
- **Error Recovery** — Graceful fallback redirects on auth failures

### 🚀 Admin Management Portal

Full-featured CMS at [`/admin`](./src/app/(admin)/admin) with:

| Feature | Implementation |
|---------|----------------|
| **Magazine Upload** | Drag-and-drop PDF with real-time processing progress |
| **Magazine CRUD** | Create, rename, delete with optimistic locking |
| **Version Conflicts** | Concurrency detection with user-friendly resolution UI |
| **Audit Logging** | Structured logging with operation context via custom Logger |

---

## 🏗️ Architecture

The application follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    Hero     │  │ MagazineCard│  │   FlipbookViewer        │  │
│  │  Component  │  │    Grid     │  │  (react-pageflip)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                          Hooks Layer                             │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │usePDFProcessor│  │ useFileUpload│  │useMagazineAnalytics│   │
│  └───────────────┘  └──────────────┘  └────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                        Services Layer                            │
│  ┌───────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │  MagazineService  │  │  UploadService  │  │ AnalyticsService │
│  │  (Transactions)   │  │  (Batch Upload) │  │ (Event Queue)│  │
│  └───────────────────┘  └─────────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      Infrastructure Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Supabase   │  │   Logger    │  │   TransactionManager    │  │
│  │  (Storage)  │  │  (Sentry)   │  │  (Rollback Support)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (admin)/                  # Admin route group (protected)
│   │   └── admin/               
│   │       ├── login/            # Authentication flow
│   │       ├── analytics/        # Reader analytics dashboard
│   │       └── [CRUD components] # Upload, Table, Actions
│   ├── (public)/                 # Public route group
│   │   ├── page.tsx              # Landing page
│   │   └── dergi/[issueNumber]/  # Magazine reader pages
│   ├── layout.tsx                # Root layout with SEO & JSON-LD
│   ├── sitemap.ts                # Dynamic sitemap generation
│   └── robots.ts                 # Robots.txt configuration
│
├── components/
│   ├── FlipbookViewer.tsx        # Core reader with zoom & analytics
│   ├── Hero.tsx                  # Animated landing section
│   ├── MagazineCard.tsx          # Issue cards with hover effects
│   └── ui/                       # Radix-based design system
│
├── hooks/
│   ├── usePDFProcessor.ts        # PDF.js integration
│   ├── useFileUpload.ts          # Multi-file upload orchestration
│   ├── useMagazineAnalytics.ts   # Reader session tracking
│   └── useWakeLock.ts            # Prevent sleep during uploads
│
├── lib/
│   ├── services/
│   │   ├── MagazineService.ts    # Transactions, optimistic locking
│   │   ├── UploadService.ts      # Batch uploads with retry
│   │   ├── AnalyticsService.ts   # Event queue with batching
│   │   └── storage/              # Storage abstraction layer
│   ├── validators/               # Zod schemas for all inputs
│   ├── errors/                   # Typed error hierarchy
│   └── guards/                   # Runtime type guards
│
└── types/                        # TypeScript definitions
```

---

## 💻 Tech Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| [Next.js](https://nextjs.org/) | 15.5.7 | App Router, Server Components, ISR, Server Actions |
| [React](https://react.dev/) | 19.1.2 | UI library with latest concurrent features |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | End-to-end type safety with strict mode |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | Utility-first with custom PostCSS pipeline |

### Backend & Storage

| Technology | Version | Purpose |
|------------|---------|---------|
| [Supabase](https://supabase.com/) | Latest | PostgreSQL database, object storage, authentication |
| [Supabase SSR](https://supabase.com/docs/guides/auth/server-side-rendering) | Latest | Server-side session management |

### Key Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| [pdf.js](https://mozilla.github.io/pdf.js/) | 4.x | PDF parsing and canvas-based rendering with worker support |
| [react-pageflip](https://github.com/nicholaspage/react-pageflip) | 2.x | Flipbook animations with CSS 3D transforms |
| [Recharts](https://recharts.org/) | 2.x | Composable React charts for analytics |
| [Zod](https://zod.dev/) | 3.x | Runtime schema validation for forms and API inputs |
| [Motion](https://motion.dev/) | Latest | Declarative animations for UI interactions |
| [Radix UI](https://www.radix-ui.com/) | Latest | Accessible component primitives (Dialog, Dropdown, Select) |
| [Sentry](https://sentry.io/) | Latest | Error tracking and performance monitoring |
| [React Hook Form](https://react-hook-form.com/) | 7.x | Performant forms with validation |

---

## 🧑‍💻 Developer Experience

The [`usePDFProcessor`](./src/hooks/usePDFProcessor.ts) hook encapsulates the entire transformation workflow:

```typescript
const { processPDF, processedPages, totalPages, isProcessing, error } = usePDFProcessor()

const result = await processPDF(file, {
  targetHeight: 2000,
  quality: 0.85,
  onProgress: (current, total) => console.log(`Processing ${current}/${total}`)
})
// Returns: { pages: Blob[], totalPages: number }
```

The [`useMagazineAnalytics`](./src/hooks/useMagazineAnalytics.ts) hook automatically tracks:
- Session initialization on magazine view
- Tab visibility changes (pause/resume events)
- Reader interactions (page turns tracked via event metadata)

---

## 🗄️ Database Schema

The application expects the following Supabase tables:

```sql
-- Magazines table
CREATE TABLE magazines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  issue_number INTEGER UNIQUE NOT NULL,
  publication_date DATE NOT NULL,
  cover_url TEXT NOT NULL,
  page_count INTEGER NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics sessions
CREATE TABLE analytics_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  magazine_id UUID REFERENCES magazines(id),
  device_type TEXT NOT NULL,
  user_agent TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ
);

-- Analytics events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES analytics_sessions(id),
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Storage Bucket Structure:**

```
magazines/
├── {issue_number}/
│   ├── cover.webp
│   └── pages/
│       ├── 1.webp
│       ├── 2.webp
│       └── ...
```

---

## 🛡️ Security & Monitoring

Production-hardened security configuration:

```typescript
// Content Security Policy (from next.config.ts)
"default-src 'self'",
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
"img-src 'self' data: blob: https:",
"frame-ancestors 'none'",
```

### HTTP Security Headers

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | Strict CSP with Supabase domain allowlist |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

### Error Recovery Strategy

| Stage | Recovery Strategy |
|-------|-------------------|
| PDF Processing | Retry with reduced quality; skip corrupt pages |
| Page Upload | Exponential backoff (3 attempts); partial upload state persisted |
| Cover Upload | Falls back to first PDF page if custom cover fails |
| Database Insert | Full rollback of uploaded files |

### Sentry Integration

- [`sentry.client.config.ts`](./sentry.client.config.ts) for frontend errors
- [`sentry.server.config.ts`](./sentry.server.config.ts) for API routes
- [`sentry.edge.config.ts`](./sentry.edge.config.ts) for middleware errors

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 8.0.0
- **Supabase Account** — [Create free project](https://supabase.com/dashboard)

### Installation

```bash
# Clone the repository
git clone https://github.com/Woffluon/Balkon-Magazine.git
cd Balkon-Magazine

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

Update `.env.local` with your credentials:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=your-client-sentry-dsn
```

### Supabase Setup

1. Create database tables using the SQL schema above
2. Configure Storage bucket:
   - Bucket name: `magazines`
   - Public access: **Enabled**
   - File size limit: **500MB**

### Development

```bash
# Start development server with Turbopack
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |
| `npm run clean` | Clean build artifacts |

---

## 📦 Deployment

### Vercel (Recommended)

This project is optimized for [Vercel](https://vercel.com/) deployment:

1. **Connect repository** to Vercel dashboard
2. **Set environment variables** in Vercel project settings
3. **Deploy** — Vercel auto-detects Next.js configuration

**Production Configuration:**
- Output mode: `standalone`
- Server Actions body size limit: 500MB (for large PDF uploads)
- Image Optimization: Disabled (`unoptimized: true`) for static hosting compatibility
- Compression: Enabled via `compress: true`

### Self-Hosting

```bash
npm run build
npm start
```

Ensure your hosting environment supports:
- Node.js 18+
- Environment variable injection
- Persistent storage for `.next` cache (optional)

### PDF.js Worker Setup

The `postinstall` script automatically copies `pdf.worker.min.mjs` to `public/`:

```bash
node -e "require('fs').copyFileSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'public/pdf.worker.min.mjs')"
```

Verify the worker is accessible at `/pdf.worker.min.mjs` after deployment.

---

## 📊 Analytics Dashboard

Access magazine insights at `/admin/analytics`:

### Available Metrics

- **Overview Cards** — Total sessions, unique users, average duration
- **Device Distribution** — Pie chart breakdown (mobile/tablet/desktop)
- **Engagement Trends** — Daily session counts with date range filters

### Implementation Details

```
React Component → useMagazineAnalytics → AnalyticsService → Supabase Tables
```

The analytics system uses:
- **Batched Writes** — Events buffer to 5 items or 10s, whichever comes first
- **Retry Logic** — Failed flushes re-queue (max 100 pending)
- **Graceful Degradation** — Fallback UUIDs if database unavailable

---

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. All code passes `npm run lint` and `npm run type-check`
2. **TypeScript Strict Mode** — All code must compile without errors
3. **Component Structure** — Keep components under 300 lines
4. **Error Handling** — Use structured error patterns from [`ErrorHandler`](./src/lib/errors/errorHandler.ts)
5. **Logging** — Use [`Logger`](./src/lib/services/Logger.ts) instead of `console.log`
6. New features include appropriate error handling and accessibility compliance

### Contribution Workflow

1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

---

## 📄 License

This project is licensed under the **MIT License** — see the [`LICENSE`](./LICENSE) file for details.

Copyright © 2025 Efe Arabacı

---

<div align="center">

**Built with ❤️ for Sezai Karakoç Anadolu Lisesi**

**Balkon Dergisi** — Where students find their voice.

[Report Bug](https://github.com/Woffluon/Balkon-Magazine/issues) • [Request Feature](https://github.com/Woffluon/Balkon-Magazine/issues)

</div>
