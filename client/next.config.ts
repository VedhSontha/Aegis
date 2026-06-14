import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  async headers() {
    return [
      {
        // Strip Vercel's auto-injected security headers from the vulnerable range
        // endpoint so AEGIS can detect missing headers as intended.
        source: '/range',
        headers: [
          { key: 'X-Frame-Options', value: '' },
          { key: 'X-Content-Type-Options', value: '' },
          { key: 'Referrer-Policy', value: '' },
          { key: 'Permissions-Policy', value: '' },
          { key: 'Strict-Transport-Security', value: '' },
          { key: 'Content-Security-Policy', value: '' },
          { key: 'X-DNS-Prefetch-Control', value: '' },
        ],
      },
    ];
  },
};

export default nextConfig;
