import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    unoptimized: true,
    domains: ['eeiauxebadeoifomrxeu.supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Server configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '100gb', // For large file uploads
    },
  },
  
  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  
  // Static file caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/pdf.worker.min.mjs',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Environment-specific optimizations
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
  }),
};

export default nextConfig;
