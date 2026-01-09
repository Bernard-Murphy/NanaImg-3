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
    dangerouslyAllowSVG: true,
  },
  // Disable static generation for all pages since we use client-side GraphQL
  experimental: {
    serverComponentsExternalPackages: ['@apollo/client'],
  },
  // Disable static optimization
  staticPageGenerationTimeout: 0,
  // Force dynamic rendering for all pages
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configure webpack for SSE
  webpack: (config, { dev }) => {
    if (dev) {
      config.externals.push({
        'utf-8-validate': 'utf-8-validate',
        'bufferutil': 'bufferutil',
      });
    }
    return config;
  },
}

module.exports = nextConfig

