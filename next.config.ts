import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Dùng <img> thuần — không cần tối ưu ảnh của next/image
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(self)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
