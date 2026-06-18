'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/app/components/AppShell'
import { listProjects, deleteProject, type ResearchProject } from '@/lib/researchEngine'
import { PageHeader, Card, FilterBtn, PrimaryBtn, Badge, EmptyState, ACCENT } from '@/app/components/research-engine/ui'

export default function ResearchEngineIndex() {
  const router = useRouter()
  const [projects, setProjects] = useState<ResearchProject[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'archived'>('all')

  useEffect(() => {
    listProjects().then(p => { setProjects(p); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const filtered = projects.filter(p => {
    const matchS = status === 'all' || (p.status || 'active') === status
    const matchQ = !q || `${p.name} ${p.product_service} ${p.industry} ${p.city}`.toLowerCase().includes(q.toLowerCase())
    return matchS && matchQ
  })

  async function onDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('¿Eliminar este proyecto de investigación y todos sus datos?')) return
    try { await deleteProject(id); setProjects(prev => prev.filter(p => p.id !== id)) } catch { alert('No se pudo eliminar (¿corriste research_engine.sql?).') }
  }

  return (
    <AppShell>
      <div className="-mx-6 -my-5 min-h-full bg-gray-50 px-7 py-6">
        <PageHeader
          title="Research Engine"
          subtitle="Proyectos de investigación de mercado local · Florida"
          actions={<PrimaryBtn onClick={() => router.push('/research-engine/new')}>+ New Research Project</PrimaryBtn>}
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar proyecto, producto, ciudad…"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-purple-400" style={{ minWidth: 260 }} />
          <FilterBtn active={status === 'all'} onClick={() => setStatus('all')}>Todos</FilterBtn>
          <FilterBtn active={status === 'active'} color={ACCENT.green} onClick={() => setStatus('active')}>Activos</FilterBtn>
          <FilterBtn active={status === 'archived'} color={ACCENT.slate} onClick={() => setStatus('archived')}>Archivados</FilterBtn>
          <span className="ml-auto text-xs text-gray-400">{filtered.length} proyectos</span>
        </div>

        {loading ? (
          <Card><div className="py-10 text-center text-sm text-gray-400">Cargando…</div></Card>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🧭" title="Aún no hay proyectos" hint="Crea tu primer proyecto de investigación de mercado." />
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {filtered.map(p => (
              <div key={p.id} onClick={() => router.push(`/research-engine/${p.id}`)}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="text-base font-bold text-gray-900">{p.name}</div>
                  <Badge color={(p.status || 'active') === 'active' ? ACCENT.green : ACCENT.slate}>{p.status || 'active'}</Badge>
                </div>
                <div className="mb-3 text-xs text-gray-500">{p.product_service || p.industry || '—'}</div>
                <div className="flex flex-wrap gap-2 text-[11px] text-gray-600">
                  {p.city && <span className="rounded-md bg-gray-100 px-2 py-1">📍 {p.city}, {p.state}</span>}
                  {p.radius ? <span className="rounded-md bg-gray-100 px-2 py-1">⌀ {p.radius} mi</span> : null}
                  {(p.year_start || p.year_end) && <span className="rounded-md bg-gray-100 px-2 py-1">{p.year_start}–{p.year_end}</span>}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-[10px] text-gray-400">{p.created_at ? new Date(p.created_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                  <button onClick={e => onDelete(e, p.id)} className="rounded-md px-2 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-50">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
