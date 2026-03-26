/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  images: {
    unoptimized: true
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  basePath: '',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/privacy-policy/:path*',
        destination: '/privacy',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // Only use rewrites in development or if NEXT_PUBLIC_API_URL is not set
    // In production (Vercel), use NEXT_PUBLIC_API_URL environment variable instead
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    // If API URL is set and not localhost, don't use rewrites (let frontend call it directly)
    if (apiUrl && !apiUrl.includes('localhost')) {
      return [];
    }
    
    // Development fallback - only for local Docker setup
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*'
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' 'inline-speculation-rules' chrome-extension: chrome-extension://* data: blob:; style-src * 'unsafe-inline'; img-src * data: blob: http: https:; font-src * data:; connect-src *; object-src 'none'; frame-src *; media-src * data: blob: http: https:; frame-ancestors *;"
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
