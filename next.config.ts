import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: process.env.NODE_ENV === 'development', // Disable optimization in dev for local assets
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/assets/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'wholesii.example.com',
        pathname: '/assets/**',
      },
    ],
  },
  rewrites: async () => ({
    afterFiles: [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/:path*`,
      },
    ],
  }),
};

export default nextConfig;
