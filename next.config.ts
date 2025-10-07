import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep if you intentionally want to build despite TS errors
  typescript: {
    ignoreBuildErrors: true,
  },

  // Allow remote images for bank logos & flags
  images: {
    remotePatterns: [
      // Flags
      {
        protocol: "https",
        hostname: "flagpedia.net",
        port: "",
        pathname: "/data/flags/**",
      },
      // Primary bank-logo source
      {
        protocol: "https",
        hostname: "nigerianbanks.xyz",
        port: "",
        pathname: "/logo/**",
      },
      // Optional fallback (only if you actually use it anywhere)
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
