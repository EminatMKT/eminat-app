/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `next build` y `next dev` comparten .next/ y se pisan: un build corrido con el server
  // levantado deja al dev sirviendo 503 en sus propios chunks, y la app queda en "Cargando…"
  // para siempre (pasó el 20/08/2026). Con esto, `pnpm build:check` escribe aparte y verifica
  // sin tocar lo que el dev está usando.
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  // Lint (y falla el build en) todo el código propio, no solo los dirs default de Next.
  eslint: { dirs: ['src'] },
  images: {
    domains: ['ruedelunbtaomhrzgelc.supabase.co'],
  },
}

module.exports = nextConfig
