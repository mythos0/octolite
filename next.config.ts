import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel builds its own optimized output; standalone is for self-hosting
  // (the sandbox preview runs the standalone server).
  output: process.env.VERCEL ? undefined : "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
