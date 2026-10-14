'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/shared/components/shell/AppShell'
import SalesDenied from './SalesDenied'
import { supabase } from '@/shared/db/supabase'
import { SUB_ITEMS } from '@/shared/components/shell/appShellConfig'
import { useSalesQaAccess } from './useSalesQaAccess'
import s from './SalesModule.module.css'

type Row = { id: string; organizationId: string; displayName?: string; name?: string; title?: string; label?: string; code?: string; status?: string; stageCode?: string; ownerProfileId?: string; email?: string; companyName?: string; dueAt?: string }
type Dashboard = { pipeline?: { openCount?: number }; closures?: { won?: number; lost?: number }; followUp?: { overdue?: number; upcoming?: number; interactionsLast30Days?: number }; opportunitiesByStage?: { code: string; label: string; count: number }[] }
type Result = { data: Row[] | (Row & { stages?: Row[] }) | Dashboard; nextCursor?: string | null; code?: string }
const paged = new Set(['leads', 'contacts', 'accounts', 'opportunities'])
const tabs = new Set(['leads', 'contacts', 'accounts', 'opportunities', 'dashboard', 'pipeline', 'activities'])
const label = (r: Row) => r.displayName ?? r.name ?? r.title ?? r.label ?? r.code ?? r.id

export default function SalesModule() {
  const [tab, setTab] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [selected, setSelected] = useState<Row | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const allowed = useSalesQaAccess()

  useEffect(() => { setCursor(null); setRows([]); setSelected(null); setNextCursor(null); setDashboard(null) }, [tab, search, status])
  useEffect(() => {
    if (!allowed || !tabs.has(tab)) return
    let cancelled = false
    const run = async () => {
      setLoading(true); setError('')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { if (!cancelled) { setError('Session required'); setLoading(false) }; return }
      const query = new URLSearchParams()
      if (paged.has(tab)) {
        query.set('limit', '25')
        if (search) query.set('q', search)
        if (status && tab === 'leads') query.set('status', status)
        if (cursor) query.set('cursor', cursor)
      } else if (tab === 'activities') query.set('limit', '50')
      try {
        const response = await fetch(`/api/integrations/annie/sales/${tab}${query.size ? `?${query}` : ''}`, { cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` } })
        const body = await response.json() as Result
        if (!response.ok) throw new Error(body.code ?? 'READ_FAILED')
        if (!cancelled) {
          if (tab === 'dashboard') setDashboard(body.data as Dashboard)
          else if (tab === 'pipeline') setRows((body.data as Row & { stages?: Row[] }).stages ?? [])
          else setRows(Array.isArray(body.data) ? body.data : [])
          setNextCursor(body.nextCursor ?? null)
        }
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : 'READ_FAILED') }
      finally { if (!cancelled) setLoading(false) }
    }
    void run()
    return () => { cancelled = true }
  }, [allowed, tab, search, status, cursor])

  async function openDetail(id: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Session required'); return }
    try {
      const response = await fetch(`/api/integrations/annie/sales/${tab}/${id}`, { cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` } })
      const body = await response.json() as { data?: Row; code?: string }
      if (!response.ok || !body.data) throw new Error(body.code ?? 'READ_FAILED')
      setSelected(body.data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'READ_FAILED') }
  }

  if (!allowed) return <SalesDenied />
  return <AppShell title={`Sales — ${SUB_ITEMS.sales.find(item => item.tab === tab)?.label ?? 'Sales'}`} activeTab={tab} onTabChange={setTab}>
    <section className={s.page}>
      <header className={s.header}><div><p className={s.eyebrow}>ANNIE · LIVE READ</p><h1>Sales</h1><p className={s.muted}>Commercial records stay in ANNIE.</p></div><span className={s.badge}>Read only</span></header>
      {paged.has(tab) && <div className={s.filters}><label>Search <input value={search} onChange={event => setSearch(event.target.value)} maxLength={200} placeholder={`Search ${tab}`} /></label>
        {tab === 'leads' && <label>Status <select value={status} onChange={event => setStatus(event.target.value)}>{['', 'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'PAYMENT_PENDING', 'WON', 'LOST'].map(value => <option key={value} value={value}>{value || 'All statuses'}</option>)}</select></label>}</div>}
      {loading && <p role="status" className={s.muted}>Loading ANNIE data…</p>}
      {error && <p role="alert" className={s.error}>{error}</p>}
      {!loading && !error && tab === 'dashboard' && dashboard && <><div className={s.stats}>
        <article><span>Open opportunities</span><strong>{dashboard.pipeline?.openCount ?? 0}</strong></article>
        <article><span>Won</span><strong>{dashboard.closures?.won ?? 0}</strong></article>
        <article><span>Overdue follow-up</span><strong>{dashboard.followUp?.overdue ?? 0}</strong></article>
        <article><span>Interactions · 30 days</span><strong>{dashboard.followUp?.interactionsLast30Days ?? 0}</strong></article>
      </div><div className={s.card}><h2>Opportunities by stage</h2><ul className={s.list}>{(dashboard.opportunitiesByStage ?? []).map(stage => <li key={stage.code}><span>{stage.label}</span><strong>{stage.count}</strong></li>)}</ul></div></>}
      {!loading && !error && tab !== 'dashboard' && <div className={s.card}><div className={s.cardHeader}><h2>{SUB_ITEMS.sales.find(item => item.tab === tab)?.label}</h2><span>{rows.length} shown</span></div>
        {rows.length === 0 ? <p className={s.muted}>No records in this view.</p> : <ul className={s.list}>{rows.map(row => <li key={row.id}><div>{tab === 'pipeline' ? <strong>{label(row)}</strong> : <button type="button" onClick={() => void openDetail(row.id)}>{label(row)}</button>}<small>{row.companyName ?? row.email ?? row.dueAt ?? row.status ?? row.stageCode ?? ''}</small></div><code title="ANNIE ID">{row.id}</code></li>)}</ul>}
        {nextCursor && <button type="button" className={s.next} onClick={() => setCursor(nextCursor)}>Next page</button>}</div>}
      {selected && <aside className={s.detail}><div className={s.cardHeader}><h2>{label(selected)}</h2><button type="button" onClick={() => setSelected(null)}>Close</button></div><dl><dt>ANNIE ID</dt><dd>{selected.id}</dd><dt>Organization</dt><dd>{selected.organizationId}</dd><dt>Status</dt><dd>{selected.status ?? selected.stageCode ?? '—'}</dd><dt>Owner ID</dt><dd>{selected.ownerProfileId ?? '—'}</dd></dl></aside>}
    </section>
  </AppShell>
}
