import type { NextConfig } from "next";
import path from "path";

const isVercel = process.env.VERCEL === '1';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.dummyjson.com",
      },
    ],
  },
  // Fixes "workspace root" warnings locally without breaking Vercel paths
  outputFileTracingRoot: isVercel ? undefined : path.join(__dirname, "../../.."),
};

export default nextConfig;
