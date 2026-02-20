/** @type {import('next').Metadata} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '103.197.189.71', // IP VPS kamu
        port: '3000',
      },
      {
        protocol: 'https',
        hostname: 'hnmstore.id', // Domain kamu
      },
    ],
  },
}

module.exports = nextConfig