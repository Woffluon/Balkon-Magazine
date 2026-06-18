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

  webpack: (config, { isServer, dev }) => {
    // Suppress OpenTelemetry instrumentation warnings
    if (isServer) {
      config.ignoreWarnings = [
        { module: /node_modules\/@opentelemetry\/instrumentation/ },
        ...(config.ignoreWarnings || []),
      ];
    }

    // Configure splitChunks for client in production
    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            default: false,
            vendors: false,
            // Separate pdfjs-dist
            pdfjs: {
              name: 'pdfjs',
              test: /[\\/]node_modules[\\/]pdfjs-dist[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Separate react-pageflip
            pageflip: {
              name: 'pageflip',
              test: /[\\/]node_modules[\\/]react-pageflip[\\/]/,
              priority: 35,
              enforce: true,
            },
            // Separate recharts
            recharts: {
              name: 'recharts',
              test: /[\\/]node_modules[\\/]recharts[\\/]/,
              priority: 30,
              enforce: true,
            },
            // React & Next core
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Split other large vendors
            lib: {
              test(module: any) {
                return module.size() > 80000 && /node_modules/.test(module.identifier());
              },
              name(module: any) {
                const hash = require('crypto')
                  .createHash('sha1')
                  .update(module.identifier())
                  .digest('hex')
                  .slice(0, 8);
                return `lib-${hash}`;
              },
              priority: 10,
              minChunks: 1,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },

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
