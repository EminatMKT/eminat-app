'use client'
import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import AppShell from '@/app/components/AppShell'
import { ProjectProvider, useProject } from '@/app/components/research-engine/ProjectProvider'
import { Badge, ACCENT } from '@/app/components/research-engine/ui'

function ProjectChrome({ id, children }: { id: string; children: ReactNode }) {
  const { project, loading } = useProject()
  const pathname = usePathname()
  const router = useRouter()
  const base = `/research-engine/${id}`

  const tabs = [
    { label: 'Dashboard', href: base, icon: '📊' },
    { label: 'Competitors', href: `${base}/competitors`, icon: '🏢' },
    { label: 'Pricing', href: `${base}/pricing`, icon: '💲' },
    { label: 'Social', href: `${base}/social`, icon: '📱' },
    { label: 'Insights', href: `${base}/insights`, icon: '💡' },
    { label: 'Sources', href: `${base}/sources`, icon: '🔗' },
    { label: 'Report', href: `${base}/report`, icon: '📄' },
  ]

  return (
    <div className="-mx-6 -my-5 min-h-full bg-gray-50 px-7 py-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={() => router.push('/research-engine')} className="mb-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600">← Global Digital Insights</button>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{loading ? '…' : (project?.name || 'Proyecto')}</h1>
          {project && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {project.product_service && <span>{project.product_service}</span>}
              {project.city && <span>· 📍 {project.city}, {project.state}</span>}
              {project.radius ? <span>· ⌀ {project.radius} mi</span> : null}
              <Badge color={(project.status || 'active') === 'active' ? ACCENT.green : ACCENT.slate}>{project.status || 'active'}</Badge>
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map(t => {
          const active = t.href === base ? pathname === base : pathname.startsWith(t.href)
          return (
            <Link key={t.href} href={t.href}
              className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${active ? 'border-b-2 bg-white text-gray-900' : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'}`}
              style={active ? { borderBottomColor: ACCENT.purple, color: ACCENT.purple } : undefined}>
              <span>{t.icon}</span>{t.label}
            </Link>
          )
        })}
      </div>

      {loading
        ? <div className="py-16 text-center text-sm text-gray-400">Cargando proyecto…</div>
        : !project
          ? <div className="py-16 text-center text-sm text-gray-500">Proyecto no encontrado. ¿Corriste <code>research_engine.sql</code>?</div>
          : children}
    </div>
  )
}

export default function ProjectLayout({ children, params }: { children: ReactNode; params: { id: string } }) {
  return (
    <AppShell>
      <ProjectProvider projectId={params.id}>
        <ProjectChrome id={params.id}>{children}</ProjectChrome>
      </ProjectProvider>
    </AppShell>
  )
}
