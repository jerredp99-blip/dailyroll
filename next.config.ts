import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === "true" && !process.env.VERCEL
    ? { output: "standalone" }
    : {}),
};

export default nextConfig;
