<p align="center">
  <img src="public/favicon.png" alt="Balkon Dergisi" width="96" height="96" />
</p>

<h1 align="center">Balkon Dergisi</h1>

<p align="center">
  <strong>Digital Magazine Platform for Sezai Karakoç Anadolu Lisesi</strong>
</p>

<p align="center">
  <em>"Şu içimizin de balkonu olsaydı, çıkıp arada nefes alsaydık."</em>
</p>

<p align="center">
  <a href="#architecture">Architecture</a> •
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.5-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## Overview

**Balkon Dergisi** is a production-grade digital magazine platform built for [Sezai Karakoç Anadolu Lisesi](https://sezaikarakoc.meb.k12.tr/). The platform enables the school's editorial team to publish, manage, and showcase student magazines through an immersive flipbook reading experience.

The name "Balkon" (Turkish for "Balcony") embodies the platform's philosophy—providing students a space to breathe, express themselves, and share their creative work with the world.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Interactive Flipbook Reader** | Hardware-accelerated page-turning with zoom, keyboard navigation, and touch gestures |
| **PDF-to-Magazine Pipeline** | Automated PDF processing with page extraction, WebP conversion, and parallel uploads |
| **Admin Dashboard** | Complete CRUD operations with optimistic locking, transaction rollback, and audit trails |
| **Analytics Engine** | Session-based reader analytics with device tracking and engagement metrics |
| **Production Security** | CSP headers, rate limiting, input sanitization, and Sentry error monitoring |

---

## Architecture

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
│   ├── usePDFProcessor.ts        # PDF.js integration (450 lines)
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

## Features

### 📖 Interactive Magazine Reader

The `FlipbookViewer` component delivers a native magazine reading experience:

- **Page Turning**: CSS 3D transforms via [react-pageflip](https://github.com/nicholaspage/react-pageflip) with 60fps animations
- **Zoom Controls**: Pinch-to-zoom and button controls with smooth interpolation
- **Page Lock**: Lock current spread to prevent accidental navigation
- **Keyboard Navigation**: Arrow keys, space bar, and escape key bindings
- **Image Preloading**: Configurable look-ahead to minimize loading states
- **Accessibility**: ARIA live regions announce page changes to screen readers

### 📤 PDF Upload Pipeline

Enterprise-grade PDF processing with comprehensive error recovery:

```
PDF File → Page Extraction → WebP Conversion → Parallel Upload → Database Record
    ↓            ↓                 ↓                 ↓               ↓
 Validation   pdf.js          Canvas API      Batch (3 concurrent)  Transaction
 Magic bytes  Worker          quality=0.9     Retry (3 attempts)    Rollback
```

**Key Technical Details:**
- PDF parsing via [pdf.js](https://mozilla.github.io/pdf.js/) with dedicated web worker
- Page rendering to OffscreenCanvas with configurable target height (1400px default)
- WebP encoding at 90% quality for optimal size/quality balance
- Batched parallel uploads (3 concurrent) with exponential backoff retry
- Wake Lock API integration to prevent device sleep during long uploads
- Full transaction support: storage uploads roll back if database insert fails

### 🔐 Admin Dashboard

Protected admin area with Supabase authentication:

| Feature | Implementation |
|---------|----------------|
| **Authentication** | Supabase Auth with JWT, automatic session refresh (5 min before expiry) |
| **Magazine CRUD** | Create, rename, delete with optimistic locking |
| **Version Conflicts** | Concurrency detection with user-friendly resolution UI |
| **Audit Logging** | Structured logging with operation context via custom Logger |
| **Rate Limiting** | Configurable rate limits per operation type |

### 📊 Analytics System

Session-based analytics with batched event collection:

- **Session Tracking**: Device type, user agent, session duration
- **Event Queue**: Client-side batching (5 events or 10s interval)
- **Graceful Degradation**: Falls back to UUIDs if database insert fails
- **Dashboard**: Recharts-powered visualization of reader engagement

### 🛡️ Security & Observability

Production-hardened security configuration:

```typescript
// Content Security Policy (from next.config.ts)
"default-src 'self'",
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
"img-src 'self' data: blob: https:",
"frame-ancestors 'none'",
```

- **CSP Headers**: Strict content security policy with Supabase domain allowlist
- **X-Frame-Options**: DENY to prevent clickjacking
- **Sentry Integration**: Error tracking with custom fingerprinting and alerts
- **Input Validation**: Zod schemas with magic byte verification for file uploads

---

## Tech Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| [Next.js](https://nextjs.org/) | 15.5.7 | React framework with App Router |
| [React](https://react.dev/) | 19.1.2 | UI library (latest stable) |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | Utility-first styling |

### Backend & Storage

| Technology | Purpose |
|------------|---------|
| [Supabase](https://supabase.com/) | PostgreSQL database, object storage, authentication |
| [Supabase SSR](https://supabase.com/docs/guides/auth/server-side-rendering) | Server-side session management |

### Key Libraries

| Library | Purpose |
|---------|---------|
| [pdf.js](https://mozilla.github.io/pdf.js/) | PDF parsing and rendering |
| [react-pageflip](https://github.com/nicholaspage/react-pageflip) | Flipbook animations |
| [Recharts](https://recharts.org/) | Analytics visualizations |
| [Zod](https://zod.dev/) | Runtime schema validation |
| [Motion](https://motion.dev/) | Animation primitives |
| [Radix UI](https://www.radix-ui.com/) | Accessible component primitives |
| [Sentry](https://sentry.io/) | Error monitoring and alerting |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 8.0.0
- **Supabase Project** with storage bucket configured

### Environment Setup

Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Site Configuration (Optional)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_GOOGLE_VERIFICATION=your-google-verification-code
```

### Installation

```bash
# Install dependencies
npm install

# Start development server with Turbopack
npm run dev
```

The application will be available at `http://localhost:3000`.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |

---

## Deployment

### Vercel (Recommended)

The project is optimized for [Vercel](https://vercel.com) deployment:

1. Connect your repository to Vercel
2. Configure environment variables in project settings
3. Deploy

**Production Configuration:**
- Output mode: `standalone` (automatic in production)
- Server Actions body size limit: 500MB (for large PDF uploads)
- Node.js version: 18.x or 20.x

### Manual Deployment

For self-hosted deployment:

```bash
# Build for production
npm run build

# Start production server
npm run start
```

---

## Database Schema

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

## Error Handling

The application implements a comprehensive error handling strategy:

### Error Hierarchy

```
AppError (base)
├── ProcessingError   → PDF/image processing failures
├── StorageError      → Supabase storage operations
├── DatabaseError     → Database queries and transactions
└── ValidationError   → Input validation failures
```

### Error Recovery

| Stage | Recovery Strategy |
|-------|-------------------|
| PDF Processing | Retry with reduced quality; skip corrupt pages |
| Page Upload | Exponential backoff (3 attempts); partial upload state persisted |
| Cover Upload | Falls back to first PDF page if custom cover fails |
| Database Insert | Full rollback of uploaded files |

---

## Performance Optimizations

- **Image Preloading**: Configurable pages-ahead preloading in `FlipbookViewer`
- **Dynamic Imports**: `FlipbookViewer` loaded client-side only via `next/dynamic`
- **WebP Format**: 30-50% smaller than JPEG with comparable quality
- **Batch Uploads**: 3 concurrent uploads balance speed and reliability
- **Canvas Optimization**: OffscreenCanvas for non-blocking page rendering

---

## Contributing

Contributions are welcome. Please ensure:

1. All code passes `npm run lint` and `npm run type-check`
2. New features include appropriate error handling
3. Sensitive operations include audit logging
4. UI changes maintain accessibility compliance

---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

Copyright © 2025 [Efe Arabacı](https://github.com/efearabaci)

---

<p align="center">
  <strong>Balkon Dergisi</strong> — Where students find their voice.
</p>
