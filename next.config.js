/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: false, // Temporalmente desactivado para evitar llamadas dobles en desarrollo
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
