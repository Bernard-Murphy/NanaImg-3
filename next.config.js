/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['f.feednana.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig

