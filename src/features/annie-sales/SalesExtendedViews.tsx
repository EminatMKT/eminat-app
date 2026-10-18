'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import s from './SalesModule.module.css'

type Tab = 'memberships' | 'reports' | 'social'
type Membership = {
  id: string; code: string; firstName: string; lastName: string; plan?: string | null
  modality?: string | null; duration?: string | null; effectiveStatus: string
  issuedAt: string; expiresAt: string; isDemo?: boolean; hasPdf?: boolean
}
type MembershipDetail = { data: Membership; periods?: { startsAt: string; expiresAt: string; plan: string; duration: string }[] }
type Bucket = { code: string; label?: string; count: number; converted?: number; conversionRate?: number }
type Report = { data: {
  conversion: { totalLeads: number; converted: number; rate: number }
  outcomes: { won: number; lost: number }
  membershipsSold: number; unresponsiveLeads: number
  leadsByStage: Bucket[]; leadsBySource: Bucket[]; leadsBySeller: Bucket[]
  pipeline: Bucket[]; membershipsByPlan: Bucket[]; membershipsByModality: Bucket[]
  activityPerformance: { interactions: number; byKind: Bucket[] }
} }
type SocialConnection = { id: string; displayName?: string; pageName?: string; status?: string; provider?: string }
type SocialConversation = { id: string; displayName?: string; participantName?: string; status?: string; channel?: string }
type SocialProvider = { id: string; capabilities?: Record<string, boolean> }

async function extended(path: string): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Session required')
  return fetch(`/api/integrations/annie/sales/extended/${path}`, {
    cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
  })
}

async function json<T>(path: string): Promise<T> {
  const response = await extended(path)
  let body: T & { code?: string }
  try { body = await response.json() as T & { code?: string } }
  catch { throw new Error('ANNIE_INVALID_RESPONSE') }
  if (!response.ok) throw new Error(body.code ?? 'ANNIE_REQUEST_FAILED')
  return body
}

function Memberships() {
  const [search, setSearch] = useState('')
  const [demo, setDemo] = useState('ALL')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Membership[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [selected, setSelected] = useState<MembershipDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { setPage(1); setSelected(null) }, [search, demo, status])
  useEffect(() => {
    let cancelled = false
    const query = new URLSearchParams({ page: String(page), demo })
    if (search.trim()) query.set('search', search.trim())
    if (status) query.set('status', status)
    setLoading(true); setError('')
    void json<{ data: Membership[]; hasMore: boolean }>(`memberships?${query}`).then(result => {
      if (!cancelled) { setRows(result.data); setHasMore(result.hasMore) }
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'MEMBERSHIPS_UNAVAILABLE') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [search, demo, status, page])

  async function open(id: string) {
    setError('')
    try { setSelected(await json<MembershipDetail>(`memberships/${id}`)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'MEMBERSHIP_UNAVAILABLE') }
  }
  async function download(id: string) {
    setError('')
    try {
      const response = await extended(`memberships/${id}/pdf`)
      if (!response.ok || !response.headers.get('content-type')?.startsWith('application/pdf'))
        throw new Error('PDF_UNAVAILABLE')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url; link.download = 'corazon-salud-membership.pdf'
      document.body.append(link); link.click(); link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'PDF_UNAVAILABLE') }
  }
  return <>
    <div className={s.filters}>
      <label>Search <input value={search} onChange={event => setSearch(event.target.value)} maxLength={160} placeholder="Name or membership code" /></label>
      <label>Records <select value={demo} onChange={event => setDemo(event.target.value)}><option value="ALL">All</option><option value="REAL">Real</option><option value="DEMO">Demo</option></select></label>
      <label>Status <select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{['ACTIVE', 'EXPIRING', 'EXPIRED', 'CANCELLED'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    {loading && <p role="status">Loading memberships from ANNIE…</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {!loading && !error && <div className={s.card}><div className={s.cardHeader}><h2>Memberships</h2><span>{rows.length} shown</span></div>
      {rows.length ? <ul className={s.list}>{rows.map(row => <li key={row.id}><div><button type="button" onClick={() => void open(row.id)}>{row.firstName} {row.lastName}</button><small>{row.code} · {row.plan ?? 'Legacy'} · {row.modality ?? '—'} · {row.duration ?? '—'}</small></div><small>{row.effectiveStatus}{row.isDemo ? ' · Demo' : ''}</small></li>)}</ul> : <p className={s.muted}>No memberships match these filters.</p>}
      <div className={s.filters}><button className={s.next} type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page}</span><button className={s.next} type="button" disabled={!hasMore} onClick={() => setPage(value => value + 1)}>Next</button></div>
    </div>}
    {selected && <aside className={s.detail}><div className={s.cardHeader}><h2>{selected.data.firstName} {selected.data.lastName}</h2><button type="button" onClick={() => setSelected(null)}>Close</button></div>
      <dl><dt>Code</dt><dd>{selected.data.code}</dd><dt>Status</dt><dd>{selected.data.effectiveStatus}</dd><dt>Plan</dt><dd>{selected.data.plan ?? 'Legacy'}</dd><dt>Modality</dt><dd>{selected.data.modality ?? '—'}</dd><dt>Duration</dt><dd>{selected.data.duration ?? '—'}</dd><dt>Issued</dt><dd>{selected.data.issuedAt.slice(0, 10)}</dd><dt>Expires</dt><dd>{selected.data.expiresAt.slice(0, 10)}</dd></dl>
      {selected.data.hasPdf && <button className={s.next} type="button" onClick={() => void download(selected.data.id)}>Download ANNIE membership PDF</button>}
      {(selected.periods?.length ?? 0) > 0 && <div><h3>Periods</h3><ul>{selected.periods?.map(period => <li key={`${period.startsAt}-${period.expiresAt}`}>{period.startsAt.slice(0, 10)} – {period.expiresAt.slice(0, 10)} · {period.plan} · {period.duration}</li>)}</ul></div>}
    </aside>}
  </>
}

function ReportList({ title, rows }: { title: string; rows: Bucket[] }) {
  return <div className={s.card}><h2>{title}</h2>{rows.length ? <ul className={s.list}>{rows.map((row, index) => <li key={`${row.code}-${index}`}><span>{row.label ?? row.code}</span><strong>{row.count}</strong></li>)}</ul> : <p className={s.muted}>No data for this period.</p>}</div>
}

function Reports() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [range, setRange] = useState({ from: '', to: '' })
  const [report, setReport] = useState<Report['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    const query = new URLSearchParams()
    if (range.from) query.set('from', range.from)
    if (range.to) query.set('to', range.to)
    setLoading(true); setError('')
    void json<Report>(`reports${query.size ? `?${query}` : ''}`).then(result => {
      if (!cancelled) setReport(result.data)
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'REPORTS_UNAVAILABLE') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [range])
  return <>
    <form className={s.filters} onSubmit={event => { event.preventDefault(); if (!from || !to || to >= from) setRange({ from, to }) }}>
      <label>From <input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label>To <input type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} /></label>
      <button className={s.next} type="submit">Apply period</button>
    </form>
    {loading && <p role="status">Loading ANNIE reports…</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {!loading && report && <><div className={s.stats}>
      <article><span>Leads</span><strong>{report.conversion.totalLeads}</strong></article>
      <article><span>Conversion</span><strong>{report.conversion.rate}%</strong></article>
      <article><span>Won</span><strong>{report.outcomes.won}</strong></article>
      <article><span>Lost</span><strong>{report.outcomes.lost}</strong></article>
      <article><span>Memberships sold</span><strong>{report.membershipsSold}</strong></article>
      <article><span>Unresponsive leads</span><strong>{report.unresponsiveLeads}</strong></article>
      <article><span>Interactions</span><strong>{report.activityPerformance.interactions}</strong></article>
    </div>
      <ReportList title="Leads by stage" rows={report.leadsByStage} />
      <ReportList title="Leads by source" rows={report.leadsBySource} />
      <ReportList title="Leads by seller" rows={report.leadsBySeller.map(row => ({ ...row, count: row.count }))} />
      <ReportList title="Opportunities by stage" rows={report.pipeline} />
      <ReportList title="Memberships by plan" rows={report.membershipsByPlan} />
      <ReportList title="Memberships by modality" rows={report.membershipsByModality} />
      <ReportList title="Activity by kind" rows={report.activityPerformance.byKind} />
    </>}
  </>
}

function Social() {
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [conversations, setConversations] = useState<SocialConversation[]>([])
  const [health, setHealth] = useState('')
  const [providers, setProviders] = useState<SocialProvider[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    void Promise.allSettled([
      json<{ data: SocialConnection[] }>('meta/connections'),
      json<{ data: SocialConversation[] }>('meta/conversations'),
      json<{ data?: { mode?: string; webhooks?: string } }>('meta/status'),
      json<{ data: SocialProvider[] }>('social/providers'),
    ]).then(([c, inbox, status, available]) => {
      if (cancelled) return
      if (c.status === 'fulfilled') setConnections(c.value.data ?? [])
      if (inbox.status === 'fulfilled') setConversations(inbox.value.data ?? [])
      if (status.status === 'fulfilled') setHealth(`Mode: ${status.value.data?.mode ?? 'Unavailable'} · Webhooks: ${status.value.data?.webhooks ?? 'Unavailable'}`)
      if (available.status === 'fulfilled') setProviders(available.value.data ?? [])
      if ([c, inbox, status, available].some(result => result.status === 'rejected'))
        setError('Some ANNIE Social sections are unavailable. Available sections remain visible.')
    })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])
  return <>
    {loading && <p role="status">Loading Social from ANNIE…</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {!loading && <><div className={s.card}><h2>Connection health</h2><p>{health || 'Unavailable'}</p><p className={s.muted}>Providers: {providers.map(provider => provider.id).join(', ') || 'None available'}</p></div>
      <div className={s.card}><div className={s.cardHeader}><h2>Connections</h2><span>{connections.length}</span></div>{connections.length ? <ul className={s.list}>{connections.map(connection => <li key={connection.id}>{connection.displayName ?? connection.pageName ?? connection.provider ?? 'Meta Page'} <small>{connection.status ?? 'Status unavailable'}</small></li>)}</ul> : <p className={s.muted}>No live Social connection is available yet.</p>}</div>
      <div className={s.card}><div className={s.cardHeader}><h2>Inbox</h2><span>{conversations.length}</span></div>{conversations.length ? <ul className={s.list}>{conversations.map(conversation => <li key={conversation.id}>{conversation.displayName ?? conversation.participantName ?? 'Conversation'} <small>{conversation.channel ?? ''} {conversation.status ?? ''}</small></li>)}</ul> : <p className={s.muted}>No conversations are available.</p>}</div>
    </>}
  </>
}

export default function SalesExtendedViews({ tab }: { tab: Tab }) {
  if (tab === 'memberships') return <Memberships />
  if (tab === 'reports') return <Reports />
  return <Social />
}
