import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2gb',
    },
    proxyClientMaxBodySize: '2gb',
  },
};

export default nextConfig;
