import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  typescript: {
    // Temporarily ignore build errors
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flagpedia.net",
        port: "",
        pathname: "/data/flags/**",
      },
    ],
  },
};

export default nextConfig;
