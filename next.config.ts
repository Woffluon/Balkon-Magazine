import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    domains: ['eeiauxebadeoifomrxeu.supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },
  outputFileTracingRoot: process.cwd(),
  
  experimental: {
    serverActions: {
      bodySizeLimit: '100gb',
    },
  },
  
  poweredByHeader: false,
  compress: true,
  
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
    ];
  },
  
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
  }),
};

export default nextConfig;
