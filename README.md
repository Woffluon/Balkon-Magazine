# 📖 Balcony Magazine - Sezai Karakoç Anatolian High School

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.5.2-black?style=for-the-badge&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind">
  <img src="https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase" alt="Supabase">
</div>

<div align="center">
  <h3>🌟 Modern Digital Magazine Platform</h3>
  <p><em>"If only our insides had a balcony, so we could step out and breathe sometimes."</em></p>
  <p>The digital balcony where Sezai Karakoç Anatolian High School students share their creative works</p>
</div>

---

## 🎯 About the Project

**Balcony Magazine** is a modern web platform designed to showcase the literary and artistic works of Sezai Karakoç Anatolian High School students in a digital environment. This project aims to provide an interactive and aesthetic platform where students can freely express their creativity.

### 🌟 Key Features

- **📱 Responsive Design**: Perfect display on all devices
- **📖 Interactive Magazine Viewer**: Reading experience with page-turning effect
- **🔐 Secure Admin Panel**: Protected admin interface for content management
- **⚡ Fast PDF Processing**: Automatic PDF-WebP conversion
- **🎨 Modern Animations**: Smooth transitions and visual effects
- **🔍 SEO Optimization**: Optimized for search engines
- **♿ Accessibility**: Design compliant with WCAG standards

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework**: Next.js 15.5.2 (App Router)
- **UI Library**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI primitives
- **Animations**: Motion (Framer Motion)
- **Form Management**: React Hook Form + Zod validation

### Backend & Services
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **PDF Processing**: PDF.js + PDF-lib

### Development Tools
- **Build Tool**: Turbopack (development)
- **Type Safety**: TypeScript 5
- **Code Quality**: ESLint + Custom rules
- **Package Manager**: npm

## 🚀 Setup and Running

### Prerequisites

```bash
Node.js >= 18.0.0
npm >= 8.0.0
Git
```

### 1. Clone the Project

```bash
git clone <repository-url>
cd balkon-dergisi
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Fill in the required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Available Commands

| Command | Description |
|-------|----------|
| `npm run dev` | Starts the development server (with Turbopack) |
| `npm run build` | Builds for production |
| `npm run start` | Starts the production server |
| `npm run lint` | Performs code quality check |
| `npm run type-check` | Performs TypeScript type checking |
| `npm run clean` | Cleans build files |

## 📁 Project Structure

```
balkon-dergisi/
├── 📂 public/
├── 📂 src/
│   ├── 📂 app/                # Next.js App Router
│   │   ├── 📂 admin/          # Admin panel
│   │   ├── 📂 dergi/[sayi]/   # Dynamic magazine pages
│   │   ├── layout.tsx         # Main layout
│   │   ├── page.tsx           # Home page
│   │   ├── sitemap.ts         # SEO sitemap
│   │   └── robots.ts          # SEO robots.txt
│   ├── 📂 components/         # React components
│   │   ├── 📂 ui/             # Core UI components
│   │   ├── FlipbookViewer.tsx # Magazine viewer
│   │   ├── Header.tsx         # Site header
│   │   ├── Hero.tsx           # Home page hero
│   │   ├── MagazineCard.tsx   # Magazine card
│   │   └── MagazineGrid.tsx   # Magazine list
│   ├── 📂 lib/                # Utility libraries
│   │   ├── 📂 supabase/       # Supabase configuration
│   │   ├── magazines.ts       # Magazine operations
│   │   └── utils.ts           # Utility functions
│   └── 📂 types/              # TypeScript type definitions
│       ├── magazine.ts        # Magazine types
│       └── react-pageflip.d.ts # Third-party type definitions
├── 📄 components.json         # Shadcn/ui configuration
├── 📄 middleware.ts           # Next.js middleware
├── 📄 next.config.ts          # Next.js configuration
├── 📄 tailwind.config.js      # Tailwind configuration
├── 📄 tsconfig.json           # TypeScript configuration
```

## 🎨 User Interface Features

### Home Page
- Animated hero section with school branding
- Magazine grid with hover effects
- Responsive design for all devices
- Optimized loading with skeleton states

### Magazine Viewer
- Interactive page-flip animations
- Zoom and navigation controls
- Mobile-friendly touch gestures
- Keyboard navigation support

### Admin Panel
- Secure authentication with Supabase
- Drag & drop file upload
- Real-time upload progress
- Background processing support
- Automatic PDF optimization

## 🔧 Advanced Configuration

### PDF Worker Configuration

The application uses PDF.js from a CDN for processing PDF files:

```javascript
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs'
```
```

### Supabase Configuration

1. Create a Supabase project
2. Create a storage bucket: `magazines`
3. Configure authentication settings
4. Create database tables

### Security Settings

Middleware automatically protects admin routes:

```typescript
// middleware.ts
export const config = {
  matcher: ['/admin/:path*']
}
```

## 🚀 Deployment

### Automatic Deployment with Vercel (Recommended)

1. Upload code to GitHub
2. Connect the repository to Vercel
3. Add environment variables
4. Automatic deployment starts

### Manual Server Deployment

```bash
# Production build
npm run build

# Production server
npm start
```

### Environment Variables

These variables are required in the production environment:

```env
NEXT_PUBLIC_SUPABASE_URL=production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=production_supabase_anon_key
```

## 🧪 Test and Quality Control

### Pre-deployment Checklist

- [x] `npm run build` successful
- [x] `npm run type-check` error-free
- [x] `npm run lint` clean
- [x] All features tested
- [x] Mobile responsiveness checked
- [x] SEO meta tags checked

## 📊 Performance Optimizations

- **Image Optimization**: Next.js automatic image optimization
- **Bundle Splitting**: Automatic code splitting
- **Caching**: Proper cache headers for static assets
- **Lazy Loading**: Components and images loaded on demand
- **WebP Conversion**: Automatic PDF to WebP conversion

## 🤝 Contributing

This project was developed for Sezai Karakoç Anatolian High School. To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended rules
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format
- **Component Architecture**: Modular and reusable components

## 🔗 Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)
- [PDF.js](https://mozilla.github.io/pdf.js/)

## 📞 Contact

**Sezai Karakoç Anatolian High School**  
Efe Arabacı

Email: efe.arabaci.dev@gmail.com  
Website: [Balcony Magazine](https://balkon.vercel.app)

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p><strong>"Every page a story ❋ Every story a balcony ❋ Every balcony a breath"</strong></p>
  <p>Made with ❤️ by Sezai Karakoç Anatolian High School</p>
  <p>⭐ If you liked this project, don't forget to star it!</p>

</div>

