/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We ignore typescript errors here because Android files in app/src might occasionally trip up the nextjs builder
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
