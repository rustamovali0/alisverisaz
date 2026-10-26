import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  htmlLimitedBots: /.*/,
  poweredByHeader: false,
  output: "standalone",
  ...(process.env.REDIS_URL ? {
    cacheHandler: require.resolve("./deploy/redis-cache-handler.cjs"),
    cacheMaxMemorySize: 0,
  } : {}),
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://cloudflareinsights.com",
            "frame-src https://challenges.cloudflare.com https://www.google.com https://maps.google.com",
            "frame-ancestors 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "worker-src 'self' blob:",
            "media-src 'self' blob: https:",
            "manifest-src 'self'",
            "upgrade-insecure-requests",
          ].join("; "),
        },
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        { key: "Origin-Agent-Cluster", value: "?1" },
      ],
    }];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  serverExternalPackages: ["sharp"],
  images: {
    minimumCacheTTL: 86400,
    formats: ["image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.alisveris.az",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
