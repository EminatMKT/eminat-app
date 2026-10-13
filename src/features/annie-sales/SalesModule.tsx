'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/shared/components/shell/AppShell'
import AccessDenied from '@/shared/components/access/AccessDenied'
import { useApp } from '@/shared/context/AppContext'
import { supabase } from '@/shared/db/supabase'
import { SUB_ITEMS } from '@/shared/components/shell/appShellConfig'

type Row = { id: string; organizationId: string; displayName?: string; name?: string; status?: string; stageCode?: string; ownerProfileId?: string }
type Result = { data: Row[] | (Row & { stages?: Row[] }); nextCursor?: string | null }
const readTabs = new Set(['leads', 'contacts', 'accounts', 'opportunities', 'pipeline'])

export default function SalesModule() {
  const { modules } = useApp()
  const [tab, setTab] = useState('dashboard')
  const [company, setCompany] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [selected, setSelected] = useState<Row | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const allowed = modules.includes('sales')

  useEffect(() => { setCursor(null); setRows([]); setSelected(null); setNextCursor(null) }, [tab, company, search, status])
  useEffect(() => {
    if (!allowed || !company || !readTabs.has(tab)) return
    let cancelled = false
    const run = async () => {
      setLoading(true); setError('')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { if (!cancelled) { setError('Session required'); setLoading(false) }; return }
      const query = new URLSearchParams()
      if (tab !== 'pipeline') {
        query.set('limit', '25')
        if (search) query.set('q', search)
        if (status && tab === 'leads') query.set('status', status)
        if (cursor) query.set('cursor', cursor)
      }
      const path = `/api/integrations/annie/sales/${tab}${query.size ? `?${query}` : ''}`
      try {
        const response = await fetch(path, { cache: 'no-store', headers: {
          Authorization: `Bearer ${session.access_token}`, 'X-Lilly-Company-Code': company,
        } })
        const body = await response.json() as Result & { code?: string }
        if (!response.ok) throw new Error(body.code ?? 'READ_FAILED')
        if (!cancelled) {
          const data = body.data
          setRows(Array.isArray(data) ? data : data.stages ?? [])
          setNextCursor(body.nextCursor ?? null)
        }
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : 'READ_FAILED') }
      finally { if (!cancelled) setLoading(false) }
    }
    void run()
    return () => { cancelled = true }
  }, [allowed, tab, company, search, status, cursor])

  async function openDetail(id: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Session required'); return }
    try {
      const response = await fetch(`/api/integrations/annie/sales/${tab}/${id}`, { cache: 'no-store', headers: {
        Authorization: `Bearer ${session.access_token}`, 'X-Lilly-Company-Code': company,
      } })
      const body = await response.json() as { data?: Row; code?: string }
      if (!response.ok || !body.data) throw new Error(body.code ?? 'READ_FAILED')
      setSelected(body.data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'READ_FAILED') }
  }

  if (!allowed) return <AccessDenied />
  return <AppShell title={`Sales — ${SUB_ITEMS.sales.find(item => item.tab === tab)?.label ?? 'Sales'}`} activeTab={tab} onTabChange={setTab}>
    <section style={{ padding: 24, maxWidth: 960 }}>
      <h1>Sales</h1>
      <p>Read-only ANNIE data. Choose an explicitly mapped company code to view its records.</p>
      <label>Company code <input value={company} onChange={event => setCompany(event.target.value.trim().toUpperCase())} maxLength={80} autoComplete="off" /></label>
      {['dashboard', 'activities'].includes(tab) && <p>This section is reserved for Phase C.</p>}
      {readTabs.has(tab) && <>
        {tab !== 'pipeline' && <div style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
          <label>Search <input value={search} onChange={event => setSearch(event.target.value)} maxLength={200} /></label>
          {tab === 'leads' && <label>Status <select value={status} onChange={event => setStatus(event.target.value)}>
            {['', 'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'PAYMENT_PENDING', 'WON', 'LOST'].map(value => <option key={value} value={value}>{value || 'All'}</option>)}
          </select></label>}
        </div>}
        {loading && <p>Loading…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && <ul>{rows.map(row => <li key={row.id} style={{ margin: '10px 0' }}>
          {tab === 'pipeline' ? <span>{row.name ?? row.stageCode ?? row.id}</span> : <button type="button" onClick={() => void openDetail(row.id)}>{row.displayName ?? row.name ?? row.id}</button>}
          {' '}{row.status ?? row.stageCode ?? ''} <small>{row.id}</small>
        </li>)}</ul>}
        {nextCursor && <button type="button" onClick={() => setCursor(nextCursor)}>Next page</button>}
        {selected && <aside><h2>{selected.displayName ?? selected.name ?? selected.id}</h2>
          <dl><dt>ANNIE ID</dt><dd>{selected.id}</dd><dt>Organization ID</dt><dd>{selected.organizationId}</dd>
          <dt>Status</dt><dd>{selected.status ?? selected.stageCode ?? '—'}</dd>
          <dt>Owner ID</dt><dd>{selected.ownerProfileId ?? '—'}</dd></dl>
          <button type="button" onClick={() => setSelected(null)}>Close</button>
        </aside>}
      </>}
    </section>
  </AppShell>
}
