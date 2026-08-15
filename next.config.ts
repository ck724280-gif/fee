import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer', 'bcryptjs', 'ws', 'canvas'],
  reactStrictMode: true,
  devIndicators: false,
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns', 'clsx', 'tailwind-merge'],
  },
};

export default nextConfig;
