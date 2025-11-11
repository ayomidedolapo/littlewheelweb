// next.config.ts
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const API_V1 = "https://api.littlewheel.app";
const API_DEV = "https://dev-api.insider.littlewheel.app";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",

  // Scripts (Turnstile + YouTube player bits)
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://www.gstatic.com",

  // Iframes
  "frame-src https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com",
  // Some Safari versions still use child-src for iframes
  "child-src https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com",

  // XHR/fetch from your app
  `connect-src 'self' https://challenges.cloudflare.com ${API_V1} ${API_DEV} https://www.youtube.com https://www.youtube-nocookie.com https://www.gstatic.com`,

  // Images (add YouTube thumbs)
  "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com",

  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "flagpedia.net", pathname: "/data/flags/**" },
      { protocol: "https", hostname: "nigerianbanks.xyz", pathname: "/logo/**" },
      { protocol: "https", hostname: "logo.clearbit.com", pathname: "/**" },
      // (Optional) if you ever render direct yt thumbnails in <Image/>
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/**" },
      { protocol: "https", hostname: "img.youtube.com", pathname: "/**" },
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
          { key: "X-Frame-Options", value: "SAMEORIGIN" }, // fine; this is for others embedding *your* site
          { key: "X-XSS-Protection", value: "0" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
