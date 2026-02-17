import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trailblaze/shared", "@trailblaze/db"],
};

export default nextConfig;
