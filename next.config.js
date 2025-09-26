const nextConfig = {
    /** @type {import('next').NextConfig} */
  // Fix workspace root detection
  outputFileTracingRoot: __dirname,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.stripe.com https://va.vercel-scripts.com https://api.mapbox.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.stripe.com https://checkout.stripe.com https://m.stripe.com https://m.stripe.network; frame-ancestors 'self' https://js.stripe.com https://*.stripe.com; connect-src 'self' https://api.stripe.com https://*.stripe.com https://maps.googleapis.com https://vitals.vercel-insights.com https://api.mapbox.com https://events.mapbox.com https://checkout.stripe.com https://m.stripe.com https://m.stripe.network https://ipapi.co https://ip-api.com https://ipinfo.io; style-src 'self' 'unsafe-inline' https://api.mapbox.com https://js.stripe.com https://*.stripe.com; img-src 'self' data: https: https://api.mapbox.com https://js.stripe.com https://*.stripe.com; font-src 'self' data: https://api.mapbox.com https://js.stripe.com https://*.stripe.com; worker-src 'self' blob: https://js.stripe.com https://*.stripe.com; child-src 'self' https://js.stripe.com https://*.stripe.com https://checkout.stripe.com https://m.stripe.com https://m.stripe.network; object-src 'none';",
          },
        ],
      },
    ];
  },

  // Next.js 15 experimental features
  experimental: {
    optimizePackageImports: ['recharts', 'mapbox-gl', 'framer-motion'],
  },

  // Production optimizations
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Build optimization
  modularizeImports: {
    'recharts': {
      transform: 'recharts/lib/{{member}}',
      preventFullImport: true,
    },
  },

  // Environment variables that can be exposed to client
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    APP_VERSION: process.env.npm_package_version || '1.0.0',
  },

  // Output configuration removed for Vercel compatibility
  
  // Disable source maps in production for security
  productionBrowserSourceMaps: false,

  // Redirect configuration
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;