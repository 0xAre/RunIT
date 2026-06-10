import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: ['lucide-react', 'framer-motion', '@hello-pangea/dnd', 'recharts'],
  },
  async redirects() {
    return [
      { source: '/workspace/:id/tasks', destination: '/workspace/:id/execution', permanent: true },
      { source: '/workspace/:id/dependencies', destination: '/workspace/:id/execution', permanent: true },
      { source: '/workspace/:id/prepare', destination: '/workspace/:id/committee', permanent: true },
      { source: '/workspace/:id/agent', destination: '/workspace/:id/committee', permanent: true },
    ];
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
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
