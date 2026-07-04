import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 解决NextAuth在Vercel部署时的域名信任问题
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
