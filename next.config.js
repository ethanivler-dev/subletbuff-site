/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'doehqqwqwjebhfgdvyum.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Prevent __dirname ReferenceError in Vercel Edge Runtime.
  // The ws package (transitive dep of @supabase/realtime-js) and its optional
  // native addons reference Node-only globals; aliasing them to false lets the
  // JS-only fallback run cleanly in Edge.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ws: false,
      bufferutil: false,
      'utf-8-validate': false,
    }
    return config
  },
}

module.exports = nextConfig
