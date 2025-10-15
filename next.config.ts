import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Turnstile-only CSP
 */
const csp = [
  "default-src 'self'",
  // Turnstile script
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  // Turnstile iframe
  "frame-src https://challenges.cloudflare.com",
  // Turnstile verify/xhr
  "connect-src 'self' https://challenges.cloudflare.com",
  // Images + data/blob
  "img-src 'self' data: blob:",
  // Inline styles (for Tailwind/Next hydration)
  "style-src 'self' 'unsafe-inline'",
  // Local/inline fonts
  "font-src 'self' data:",
  // Media/workers if used
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flagpedia.net",
        pathname: "/data/flags/**",
      },
      {
        protocol: "https",
        hostname: "nigerianbanks.xyz",
        pathname: "/logo/**",
      },
      { protocol: "https", hostname: "logo.clearbit.com", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          ...(isProd ? [{ key: "Content-Security-Policy", value: csp }] : []),
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "0" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
