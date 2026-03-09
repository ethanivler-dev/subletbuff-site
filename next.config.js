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
        hostname: 'api.subletbuff.com',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://doehqqwqwjebhfgdvyum.supabase.co https://api.subletbuff.com https://maps.googleapis.com https://maps.gstatic.com https://images.unsplash.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://doehqqwqwjebhfgdvyum.supabase.co https://api.subletbuff.com https://maps.googleapis.com https://www.google-analytics.com https://va.vercel-scripts.com",
              "frame-src 'self' https://maps.googleapis.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ]
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
