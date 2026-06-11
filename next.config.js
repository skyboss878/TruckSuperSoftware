/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Never cache HTML pages
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        // Cache static assets forever (they have content hashes)
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache images for 1 day
        source: '/images/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ]
  },
  webpack: (config) => config,
}

module.exports = nextConfig
