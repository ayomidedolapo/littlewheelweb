// next.config.ts
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Add your actual API hosts here
const API_V1 = "https://api.littlewheel.app";
const API_DEV = "https://dev-api.insider.littlewheel.app";

const csp = [
  "default-src 'self'",
  // Safer defaults
  "base-uri 'self'",
  "form-action 'self'",

  // Turnstile script
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",

  // Some older Safari versions look at child-src for iframes; mirror frame-src
  "child-src https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",

  // XHR/fetch targets: self, Turnstile verify, and your API origins
  `connect-src 'self' https://challenges.cloudflare.com ${API_V1} ${API_DEV}`,

  // Images + data/blob
  "img-src 'self' data: blob:",

  // Inline styles (Tailwind/Next hydration)
  "style-src 'self' 'unsafe-inline'",

  // Local/inline fonts
  "font-src 'self' data:",

  // Media/workers if you use them
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
          // Camera policy: camera usable on same-origin (not inside third-party iframes)
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
