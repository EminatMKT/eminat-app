/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lint (y falla el build en) todo el código propio, no solo los dirs default de Next.
  eslint: { dirs: ['src'] },
  images: {
    domains: ['ruedelunbtaomhrzgelc.supabase.co'],
  },
}

module.exports = nextConfig
