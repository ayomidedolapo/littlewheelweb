import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flagpedia.net",
        port: "",
        pathname: "/data/flags/**",
      },
      {
        protocol: "https",
        hostname: "nigerianbanks.xyz",
        port: "",
        pathname: "/logo/**",
      },
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
