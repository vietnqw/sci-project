import type { NextConfig } from "next";
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from parent directory only if the file exists
// This prevents Docker build issues when the parent .env file is not available
const parentEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(parentEnvPath)) {
  config({ path: parentEnvPath });
}

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sci-demoo.s3.us-east-1.amazonaws.com',
        port: '',
        pathname: '/competition_images/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
