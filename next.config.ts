import type { NextConfig } from "next";
import { env } from "./src/lib/env";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  outputFileTracingRoot: process.cwd(),

  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },

  poweredByHeader: false,
  compress: true,

  webpack: (config, { isServer }) => {
    // Suppress OpenTelemetry instrumentation warnings
    if (isServer) {
      config.ignoreWarnings = [
        { module: /node_modules\/@opentelemetry\/instrumentation/ },
        ...(config.ignoreWarnings || []),
      ];
    }
    return config;
  },

  async headers() {
    // Extract Supabase domain from URL for CSP
    const supabaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    const supabaseDomain = supabaseUrl.hostname;

    // Extract R2 domain if configured
    let r2Domain = '';
    if (env.NEXT_PUBLIC_R2_PUBLIC_URL) {
      try {
        r2Domain = new URL(env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname;
      } catch (e) {
        // Ignore invalid URL
      }
    }

    // Content Security Policy
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      `connect-src 'self' https://${supabaseDomain} https://*.supabase.co${r2Domain ? ` https://${r2Domain}` : ''}`,
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
