import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // SUDAH BENAR: Langsung di bawah images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.icons8.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '103.197.189.71', // IP VPS lu
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'hnmstore.id', // Domain utama HnM Store [cite: 2025-12-24]
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.hnmstore.id',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: ['lucide-react'], 
};

export default nextConfig;