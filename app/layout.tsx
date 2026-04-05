import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Eminat App — Sistema de Gestión',
  description: 'Sistema de gestión creativa del Holding Eminat',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
