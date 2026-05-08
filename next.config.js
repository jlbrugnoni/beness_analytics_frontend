/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Temporalmente desactivado para evitar llamadas dobles en desarrollo
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
