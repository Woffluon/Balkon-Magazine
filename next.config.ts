import type { NextConfig } from "next";
import { env } from "./src/lib/env";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    domains: ['eeiauxebadeoifomrxeu.supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },
  outputFileTracingRoot: process.cwd(),
  
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  
  poweredByHeader: false,
  compress: true,
  
  async headers() {
    // Extract Supabase domain from URL for CSP
    const supabaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    const supabaseDomain = supabaseUrl.hostname;
    
    // Content Security Policy
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      `connect-src 'self' https://${supabaseDomain} https://*.supabase.co`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
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
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  
  ...(env.NODE_ENV === 'production' && {
    output: 'standalone',
  }),
};

export default nextConfig;
