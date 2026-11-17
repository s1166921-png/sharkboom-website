import type { NextConfig } from "next";

const githubPages = process.env.GITHUB_PAGES === "true";
const nextConfig: NextConfig = githubPages
  ? {basePath: process.env.GITHUB_PAGES_BASE_PATH ?? "/sharkboom-website", trailingSlash: true, images: {unoptimized: true}}
  : {};

export default nextConfig;
