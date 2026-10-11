'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AppShell } from '@/shared/components/shell'
import { PreferencesProvider } from '@/features/meet/lib/preferences'

const tabs = [
  { href: '/meetings', label: 'Reuniones' },
  { href: '/meetings/new', label: 'Nueva' },
  { href: '/meetings/tasks', label: 'Tasks' },
  { href: '/meetings/history', label: 'Historial' },
] as const

export default function MeetingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AppShell title="Meetings">
      <PreferencesProvider>
        <div className="meet-module mx-auto max-w-6xl space-y-6">
          <nav aria-label="Meetings" className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
            {tabs.map(({ href, label }) => {
              const active = pathname === href || (href === '/meetings' && /^\/meetings\/[^/]+/.test(pathname) && !['/meetings/new', '/meetings/tasks', '/meetings/history'].some((route) => pathname.startsWith(route)))
              return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm font-medium ${active ? 'bg-brand text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>{label}</Link>
            })}
          </nav>
          {children}
        </div>
      </PreferencesProvider>
    </AppShell>
  )
}
