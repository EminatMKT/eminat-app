import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import { LocaleProvider } from '@/shared/i18n'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Stratix Communications — Operations Hub',
  description: 'Strategy, paid media, design, web, SEO, AI and more — one dedicated creative team driving your growth',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={poppins.variable}>
      <body className={poppins.className}><LocaleProvider>{children}</LocaleProvider></body>
    </html>
  )
}
