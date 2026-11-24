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
      <body className={poppins.className}>
        {process.env.NODE_ENV === 'development' && process.env.LOCAL_REVIEW_FIXTURES === 'true' &&
          <a href="http://127.0.0.1:3110/" target="_blank" rel="noreferrer" style={{position:'fixed',bottom:8,right:8,zIndex:10000,background:'#fff1c9',color:'#382a09',padding:'8px 12px',border:'1px solid #d1b259',borderRadius:8,fontSize:12,fontFamily:'system-ui'}}>
            LOCAL PREVIEW · MOCK DATA · No production or payments
          </a>}
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  )
}
