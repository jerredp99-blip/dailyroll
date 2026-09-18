import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  ...(process.env.BUILD_STANDALONE === "true" && !process.env.VERCEL
    ? { output: "standalone" }
    : {}),
};

export default nextConfig;
