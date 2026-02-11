import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@tiptap/react', '@tiptap/starter-kit'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eizeqwcxqjyxxquclihf.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Transpile workspace packages
  transpilePackages: [
    '@simplycms/core',
    '@simplycms/admin',
    '@simplycms/ui',
    '@simplycms/plugins',
    '@simplycms/themes',
  ],
};

export default nextConfig;
