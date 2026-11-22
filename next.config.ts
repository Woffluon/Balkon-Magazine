import type { NextConfig } from "next";
import { env } from "./src/lib/env";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true" || process.env.ANALYZE === "client" || process.env.ANALYZE === "server",
});

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  outputFileTracingRoot: process.cwd(),

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },

  poweredByHeader: false,
  compress: true,
  turbopack: {},

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

  ...(env.NODE_ENV === 'production' && process.platform !== 'win32' && {
    output: 'standalone',
  }),
};

export default withBundleAnalyzer(nextConfig);
