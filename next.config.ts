import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL('https://assets.1kuji.com/**')],
  },
};

export default nextConfig;
