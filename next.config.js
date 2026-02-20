/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '103.197.189.71', // IP VPS lu
        port: '3000',
      },
      {
        protocol: 'https',
        hostname: 'hnmstore.id', // Domain lu
      },
    ],
  },
}

// Ganti module.exports jadi export default
export default nextConfig