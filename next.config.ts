import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker/Cloud Run deployment
  output: 'standalone',

  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },

  // Externalize Babel packages so they resolve correctly in API routes
  serverExternalPackages: ['@babel/core', '@babel/preset-react', '@babel/preset-typescript'],

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Enable compression
  compress: true,
};

export default nextConfig;
