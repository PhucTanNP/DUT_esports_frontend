import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Dùng <img> thuần — không cần tối ưu ảnh của next/image
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
