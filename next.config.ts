// next.config.ts
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const API_V1 = "https://api.littlewheel.app";
const API_DEV = "https://dev-api.insider.littlewheel.app";

// CSP without Cloudflare Turnstile, now allowing Google reCAPTCHA + YouTube
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",

  // Scripts (Google reCAPTCHA + YouTube player bits)
  "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://www.youtube.com https://www.youtube-nocookie.com",

  // Iframes (reCAPTCHA & YouTube)
  "frame-src https://www.google.com https://www.gstatic.com https://www.youtube.com https://www.youtube-nocookie.com",
  // Some Safari versions still use child-src for iframes
  "child-src https://www.google.com https://www.gstatic.com https://www.youtube.com https://www.youtube-nocookie.com",

  // XHR/fetch from your app
  `connect-src 'self' ${API_V1} ${API_DEV} https://www.youtube.com https://www.youtube-nocookie.com https://www.gstatic.com https://www.google.com`,

  // Images (YouTube thumbs + possible Google assets)
  "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://www.gstatic.com",

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
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "0" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
