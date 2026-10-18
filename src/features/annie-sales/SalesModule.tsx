'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/shared/components/shell/AppShell'
import SalesDenied from './SalesDenied'
import { supabase } from '@/shared/db/supabase'
import { SUB_ITEMS } from '@/shared/components/shell/appShellConfig'
import { useSalesAccess } from './useSalesQaAccess'
import LeadOperations, { type Lead } from './LeadOperations'
import ContactOperations, { type Contact } from './ContactOperations'
import AccountOperations, { type Account } from './AccountOperations'
import OpportunityOperations, { type Opportunity } from './OpportunityOperations'
import { ownerLabel, roleLabel, teamLabel, type SalesDirectory } from './salesDirectory'
import s from './SalesModule.module.css'

type Row = { id: string; organizationId: string; displayName?: string; name?: string; title?: string; label?: string; code?: string; status?: string; stageCode?: string; ownerProfileId?: string; email?: string; companyName?: string; dueAt?: string }
type Dashboard = { pipeline?: { openCount?: number }; closures?: { won?: number; lost?: number }; followUp?: { overdue?: number; upcoming?: number; interactionsLast30Days?: number }; opportunitiesByStage?: { code: string; label: string; count: number }[] }
type Result = { data: Row[] | (Row & { stages?: Row[] }) | Dashboard; nextCursor?: string | null; code?: string }
const paged = new Set(['leads', 'contacts', 'accounts', 'opportunities'])
const tabs = new Set(['leads', 'contacts', 'accounts', 'opportunities', 'dashboard', 'pipeline', 'activities'])
const label = (r: Row) => r.displayName ?? r.name ?? r.title ?? r.label ?? r.code ?? 'Untitled record'

export default function SalesModule() {
  const [tab, setTab] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [archived, setArchived] = useState(false)
  const [leadView, setLeadView] = useState<'list' | 'board'>('list')
  const [directory, setDirectory] = useState<SalesDirectory>({})
  const [cursor, setCursor] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [selected, setSelected] = useState<Row | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const access = useSalesAccess()
  const { allowed, writeEnabled, contactWriteEnabled, accountWriteEnabled, opportunityWriteEnabled } = access

  useEffect(() => { setCursor(null); setRows([]); setSelected(null); setNextCursor(null); setDashboard(null) }, [tab, search, status, ownerFilter, teamFilter, followUp, archived])
  useEffect(() => {
    if (!allowed) return
    let cancelled = false
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const response = await fetch('/api/integrations/annie/sales/directory', { cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` } })
      if (response.ok && !cancelled) {
        const body = await response.json() as { data?: SalesDirectory }
        setDirectory(body.data ?? {})
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [allowed])
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
        if (tab === 'leads' || tab === 'contacts' || tab === 'accounts' || tab === 'opportunities') {
          if (ownerFilter && tab !== 'accounts') query.set('ownerProfileId', ownerFilter)
          if (teamFilter && tab !== 'accounts') query.set('teamId', teamFilter)
          if (followUp && tab === 'leads') query.set('followUp', followUp)
          if (archived) query.set('archived', 'true')
        }
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
  }, [allowed, tab, search, status, ownerFilter, teamFilter, followUp, archived, cursor, refreshKey])

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

  function leadChanged(id: string) {
    setRefreshKey(value => value + 1)
    void openDetail(id)
  }

  if (access.loading) return <main role="status" className={s.page}>Checking Sales access…</main>
  if (!allowed) return <SalesDenied />
  return <AppShell title={`Sales — ${SUB_ITEMS.sales.find(item => item.tab === tab)?.label ?? 'Sales'}`} activeTab={tab} onTabChange={setTab}>
    <section className={s.page}>
      <header className={s.header}><div><p className={s.eyebrow}>ANNIE · LIVE</p><h1>Sales</h1><p className={s.muted}>Commercial records stay in ANNIE.</p></div><span className={s.badge}>{access.role ? `${roleLabel(access.role)} · ` : ''}{tab === 'leads' && writeEnabled ? 'Controlled Lead writes' : tab === 'contacts' && contactWriteEnabled ? 'Controlled Contact writes' : tab === 'accounts' && accountWriteEnabled ? 'Controlled Account writes' : tab === 'opportunities' && opportunityWriteEnabled ? 'Controlled Opportunity writes' : 'Read only'}</span></header>
      {paged.has(tab) && <div className={s.filters}><label>Search <input value={search} onChange={event => setSearch(event.target.value)} maxLength={200} placeholder={`Search ${tab}`} /></label>
        {tab === 'leads' && <><label>Status <select value={status} onChange={event => setStatus(event.target.value)}>{['', 'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'PAYMENT_PENDING', 'WON', 'LOST'].map(value => <option key={value} value={value}>{value || 'All statuses'}</option>)}</select></label>
          <label>Follow-up <select value={followUp} onChange={event => setFollowUp(event.target.value)}><option value="">Any</option><option value="overdue">Overdue</option><option value="next_7_days">Next 7 days</option><option value="none">None</option></select></label>
          <label>View <select value={leadView} onChange={event => setLeadView(event.target.value as 'list' | 'board')}><option value="list">List</option><option value="board">Board</option></select></label></>}
        {(tab === 'leads' || tab === 'contacts') && <><label>Owner <select value={ownerFilter} onChange={event => setOwnerFilter(event.target.value)}><option value="">All owners</option>{directory.users?.map(user => <option key={user.principalId} value={user.principalId}>{ownerLabel(directory, user.principalId)} · {roleLabel(user.role)}</option>)}</select></label>
          <label>Team <select value={teamFilter} onChange={event => setTeamFilter(event.target.value)}><option value="">All teams</option>{directory.teams?.map(team => <option key={team} value={team}>{teamLabel(directory, team)}</option>)}</select></label></>}
        {(tab === 'leads' || tab === 'contacts' || tab === 'accounts' || tab === 'opportunities') && <label>Archived <input type="checkbox" checked={archived} onChange={event => setArchived(event.target.checked)} /></label>}</div>}
      {loading && <p role="status" className={s.muted}>Loading ANNIE data…</p>}
      {error && <p role="alert" className={s.error}>{error}</p>}
      {!loading && !error && tab === 'dashboard' && dashboard && <><div className={s.stats}>
        <article><span>Open opportunities</span><strong>{dashboard.pipeline?.openCount ?? 0}</strong></article>
        <article><span>Won</span><strong>{dashboard.closures?.won ?? 0}</strong></article>
        <article><span>Overdue follow-up</span><strong>{dashboard.followUp?.overdue ?? 0}</strong></article>
        <article><span>Interactions · 30 days</span><strong>{dashboard.followUp?.interactionsLast30Days ?? 0}</strong></article>
      </div><div className={s.card}><h2>Opportunities by stage</h2><ul className={s.list}>{(dashboard.opportunitiesByStage ?? []).map(stage => <li key={stage.code}><span>{stage.label}</span><strong>{stage.count}</strong></li>)}</ul></div></>}
      {!loading && !error && tab !== 'dashboard' && <div className={s.card}><div className={s.cardHeader}><h2>{SUB_ITEMS.sales.find(item => item.tab === tab)?.label}</h2><span>{rows.length} shown</span></div>
        {rows.length === 0 ? <p className={s.muted}>No records in this view.</p> : tab === 'leads' && leadView === 'board' ? <div className={s.board}>{['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'PAYMENT_PENDING', 'WON', 'LOST'].map(stage => <section key={stage}><h3>{stage}</h3>{rows.filter(row => row.status === stage).map(row => <article key={row.id}><button type="button" onClick={() => void openDetail(row.id)}>{label(row)}</button><small>{ownerLabel(directory, row.ownerProfileId)}</small></article>)}</section>)}</div> : <ul className={s.list}>{rows.map(row => <li key={row.id}><div>{tab === 'pipeline' ? <strong>{label(row)}</strong> : <button type="button" onClick={() => void openDetail(row.id)}>{label(row)}</button>}<small>{row.companyName ?? row.email ?? row.dueAt ?? row.status ?? row.stageCode ?? ''}</small></div><small>{row.ownerProfileId ? ownerLabel(directory, row.ownerProfileId) : ''}</small></li>)}</ul>}
        {nextCursor && <button type="button" className={s.next} onClick={() => setCursor(nextCursor)}>Next page</button>}</div>}
      {selected && <aside className={s.detail}><div className={s.cardHeader}><h2>{label(selected)}</h2><button type="button" onClick={() => setSelected(null)}>Close</button></div><dl><dt>Status</dt><dd>{selected.status ?? selected.stageCode ?? '—'}</dd><dt>Owner</dt><dd>{ownerLabel(directory, selected.ownerProfileId)}</dd></dl></aside>}
      {tab === 'leads' && <LeadOperations selected={selected as Lead | null} writeEnabled={writeEnabled} onChanged={leadChanged} />}
      {tab === 'contacts' && <ContactOperations selected={selected as Contact | null} writeEnabled={contactWriteEnabled} onChanged={leadChanged} />}
      {tab === 'accounts' && <AccountOperations selected={selected as Account | null} writeEnabled={accountWriteEnabled} onChanged={leadChanged} directory={directory} />}
      {tab === 'opportunities' && <OpportunityOperations selected={selected as Opportunity | null} writeEnabled={opportunityWriteEnabled} onChanged={leadChanged} directory={directory} />}
    </section>
  </AppShell>
}
