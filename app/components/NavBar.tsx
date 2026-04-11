'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: '🏠 Dashboard' },
  { href: '/equipo', label: '👥 Equipo' },
  { href: '/solicitudes', label: '📋 Solicitudes' },
  { href: '/mkt', label: '🚀 Eminat MKT' },
  { href: '/calendario', label: '📅 Calendario' },
  { href: '/directorio', label: '🏢 Directorio' },
]

export default function NavBar() {
  const pathname = usePathname()
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-2 flex-wrap">
      <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-800 mr-4">
        ← Eminat App
      </Link>
      {LINKS.map(link => (
        <Link key={link.href} href={link.href}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            pathname === link.href ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}>
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
