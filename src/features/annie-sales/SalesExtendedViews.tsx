'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import s from './SalesModule.module.css'
import MembershipQaCreate from './MembershipQaCreate'

type Tab = 'memberships' | 'reports' | 'social'
type Membership = {
  id: string; code: string; firstName: string; lastName: string; plan?: string | null
  modality?: string | null; duration?: string | null; effectiveStatus: string
  issuedAt: string; expiresAt: string; isDemo?: boolean; hasPdf?: boolean
}
type MembershipDetail = {
  data: Membership
  periods?: { startsAt: string; expiresAt: string; plan: string; duration: string }[]
  familyMembers?: { id: string; code: string; firstName: string; lastName: string; familyMemberIndex: number | null; effectiveStatus: string }[]
}
type MembershipCatalog = {
  plans: string[]; modalities: string[]; durations: string[]
  quotes: { plan: string; modality: string; duration: string; monthlyCents: number;
    totalCents: number; visitFeeCents: number; includedVisits: number; initialMonths: number }[]
}
type Bucket = { code: string; label?: string; count: number; converted?: number; conversionRate?: number }
type Report = { data: {
  conversion: { totalLeads: number; converted: number; rate: number }
  outcomes: { won: number; lost: number }
  membershipsSold: number; unresponsiveLeads: number
  leadsByStage: Bucket[]; leadsBySource: Bucket[]; leadsBySeller: Bucket[]
  conversionBySeller: { code: string; label: string; converted: number; rate: number }[]
  salesBySeller: { code: string; label: string; memberships: number; salesByCurrency: Record<string, number> }[]
  pipeline: Bucket[]; membershipsByPlan: Bucket[]; membershipsByModality: Bucket[]
  activityPerformance: { interactions: number; byKind: Bucket[] }
} }
type ReportSchedule = { data: {
  configured: boolean
  setting: { cadence: 'daily' | 'weekly'; roles: string[] } | null
  deliveries: { id: string; cadence: string; recipientRole: string; status: string;
    periodStart: string; periodEnd: string; sentAt: string | null; errorCode: string | null }[]
} }
type ScheduleRole = 'SUPERADMIN' | 'ADMINISTRATOR' | 'SALES_MANAGER'
type ScheduleConfig = { data: { version: number; setting: {
  enabled: boolean; cadence: 'daily' | 'weekly'; roles: ScheduleRole[] } | null } }
type SocialConnection = { id: string; displayName?: string; pageName?: string; status?: string; provider?: string }
type SocialConversation = { id: string; kind: string; channel: string; lastText?: string | null;
  lastEventAt: string; unread: boolean; localEntityType?: string | null;
  connection?: { pageName?: string | null } }
type SocialEvent = { id: string; at: string; kind: string; text?: string | null }
type SocialProvider = { id: string; capabilities?: Record<string, boolean> }
type SocialAsset = { id: string; label: string; kind: string }
type SocialLead = { id: string; leadId: string; leadName: string; status: string; pageName?: string | null; createdAt: string }

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

function Memberships({ membershipQaEnabled, membershipWriteEnabled }: {
  membershipQaEnabled: boolean; membershipWriteEnabled: boolean
}) {
  const [catalog, setCatalog] = useState<MembershipCatalog | null>(null)
  const [quotePlan, setQuotePlan] = useState('')
  const [quoteModality, setQuoteModality] = useState('')
  const [quoteDuration, setQuoteDuration] = useState('')
  const [search, setSearch] = useState('')
  const [demo, setDemo] = useState('ALL')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Membership[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [selected, setSelected] = useState<MembershipDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    void json<MembershipCatalog>('memberships/catalog').then(result => {
      if (cancelled) return
      setCatalog(result)
      setQuotePlan(result.plans[0] ?? '')
      setQuoteModality(result.modalities[0] ?? '')
      setQuoteDuration(result.durations[0] ?? '')
    }).catch(() => { if (!cancelled) setCatalog(null) })
    return () => { cancelled = true }
  }, [])
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
  }, [search, demo, status, page, refreshKey])

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
  const quote = catalog?.quotes.find(item => item.plan === quotePlan &&
    item.modality === quoteModality && item.duration === quoteDuration)
  const money = (cents: number) => new Intl.NumberFormat('en-US',
    { style: 'currency', currency: 'USD' }).format(cents / 100)
  return <>
    {membershipWriteEnabled && catalog && <MembershipQaCreate paid catalog={catalog} onCreated={id => {
      setDemo('REAL'); setPage(1); setRefreshKey(value => value + 1); void open(id)
    }} />}
    {membershipQaEnabled && catalog && <MembershipQaCreate catalog={catalog} onCreated={id => {
      setDemo('DEMO'); setPage(1); setRefreshKey(value => value + 1); void open(id)
    }} />}
    {catalog && <div className={s.card}>
      <h2>ANNIE membership pricing</h2>
      <div className={s.filters}>
        <label>Plan <select value={quotePlan} onChange={event => setQuotePlan(event.target.value)}>{catalog.plans.map(plan => <option key={plan} value={plan}>{plan}</option>)}</select></label>
        <label>Type <select value={quoteModality} onChange={event => setQuoteModality(event.target.value)}>{catalog.modalities.map(modality => <option key={modality} value={modality}>{modality === 'FAMILY' ? 'Family' : 'Individual'}</option>)}</select></label>
        <label>Term <select value={quoteDuration} onChange={event => setQuoteDuration(event.target.value)}>{catalog.durations.map(duration => <option key={duration} value={duration}>{duration === 'MONTHLY' ? 'Month to month' : `${duration.slice(0, -1)} months`}</option>)}</select></label>
      </div>
      {quote && <p>{money(quote.totalCents)} initial total · {money(quote.monthlyCents)} monthly rate · {quote.initialMonths} month initial period · {quote.includedVisits} included visits per member · {money(quote.visitFeeCents)} visit fee</p>}
      {quoteDuration === 'MONTHLY' && <p className={s.muted}>Month to month starts with two months paid in advance, then continues monthly. This quote comes from ANNIE.</p>}
    </div>}
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
      {(selected.familyMembers?.length ?? 0) > 0 && <div><h3>Family members</h3><ul>{selected.familyMembers?.map(member => <li key={member.id}><button type="button" onClick={() => void open(member.id)}>{member.firstName} {member.lastName}</button> · {member.familyMemberIndex === 1 ? 'Primary member' : 'Family member'} · {member.effectiveStatus}</li>)}</ul></div>}
    </aside>}
  </>
}

function ReportList({ title, rows }: { title: string; rows: Bucket[] }) {
  return <div className={s.card}><h2>{title}</h2>{rows.length ? <ul className={s.list}>{rows.map((row, index) => <li key={`${row.code}-${index}`}><span>{row.label ?? row.code}</span><strong>{row.count}</strong></li>)}</ul> : <p className={s.muted}>No data for this period.</p>}</div>
}

function Reports({ canManageSchedule, reportScheduleWriteEnabled }: {
  canManageSchedule: boolean; reportScheduleWriteEnabled: boolean
}) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [range, setRange] = useState({ from: '', to: '' })
  const [report, setReport] = useState<Report['data'] | null>(null)
  const [schedule, setSchedule] = useState<ReportSchedule['data'] | null>(null)
  const [config, setConfig] = useState<ScheduleConfig['data'] | null>(null)
  const [scheduleError, setScheduleError] = useState('')
  const [scheduleBusy, setScheduleBusy] = useState(false)
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
  useEffect(() => {
    let cancelled = false
    void json<ReportSchedule>('reports/schedule').then(result => {
      if (!cancelled) setSchedule(result.data)
    }).catch(() => { if (!cancelled) setSchedule(null) })
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    if (!canManageSchedule) return
    let cancelled = false
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session required')
      const response = await fetch('/api/integrations/annie/sales/report-schedule', {
        cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const value = await response.json() as ScheduleConfig & { code?: string }
      if (!response.ok) throw new Error(value.code ?? 'SCHEDULE_UNAVAILABLE')
      if (!cancelled) setConfig(value.data)
    }
    void load().catch(cause => { if (!cancelled) setScheduleError(cause instanceof Error ? cause.message : 'SCHEDULE_UNAVAILABLE') })
    return () => { cancelled = true }
  }, [canManageSchedule])
  async function saveSchedule(event: React.FormEvent) {
    event.preventDefault()
    if (!config?.setting || !reportScheduleWriteEnabled || scheduleBusy) return
    setScheduleBusy(true); setScheduleError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session required')
      const response = await fetch('/api/integrations/annie/sales/report-schedule', {
        method: 'PATCH', cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' },
        body: JSON.stringify({ version: config.version, ...config.setting }),
      })
      const value = await response.json() as ScheduleConfig & { code?: string }
      if (!response.ok) throw new Error(value.code ?? 'SCHEDULE_SAVE_FAILED')
      setConfig(value.data)
      const refreshed = await json<ReportSchedule>('reports/schedule')
      setSchedule(refreshed.data)
    } catch (cause) { setScheduleError(cause instanceof Error ? cause.message : 'SCHEDULE_SAVE_FAILED') }
    finally { setScheduleBusy(false) }
  }
  const updateSetting = (change: Partial<NonNullable<ScheduleConfig['data']['setting']>>) =>
    setConfig(current => current ? { ...current, setting: { enabled: false, cadence: 'daily', roles: ['SUPERADMIN'],
      ...current.setting, ...change } } : current)
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
      <div className={s.card}><h2>Conversion by seller</h2>{report.conversionBySeller.length ?
        <ul className={s.list}>{report.conversionBySeller.map(row => <li key={row.code}><span>{row.label}</span><strong>{row.converted} converted · {row.rate}%</strong></li>)}</ul> : <p className={s.muted}>No conversion data for this period.</p>}</div>
      <div className={s.card}><h2>Membership sales by seller</h2>{report.salesBySeller.length ?
        <ul className={s.list}>{report.salesBySeller.map(row => <li key={row.code}><span>{row.label}</span><strong>{row.memberships} memberships · {Object.entries(row.salesByCurrency).map(([currency, total]) => `${currency} ${total.toFixed(2)}`).join(', ') || 'No sales amount'}</strong></li>)}</ul> : <p className={s.muted}>No membership sales for this period.</p>}</div>
      <ReportList title="Opportunities by stage" rows={report.pipeline} />
      <ReportList title="Memberships by plan" rows={report.membershipsByPlan} />
      <ReportList title="Memberships by modality" rows={report.membershipsByModality} />
      <ReportList title="Activity by kind" rows={report.activityPerformance.byKind} />
    </>}
    {schedule && <div className={s.card}><h2>Scheduled ANNIE reports</h2>
      <p>{schedule.configured && schedule.setting ? `${schedule.setting.cadence === 'daily' ? 'Daily' : 'Weekly'} · Recipient roles: ${schedule.setting.roles.join(', ')}` : 'No daily or weekly Sales summary is configured.'}</p>
      <p className={s.muted}>Delivery remains subject to ANNIE’s email safety controls.</p>
      {schedule.deliveries.length > 0 && <ul className={s.list}>{schedule.deliveries.map(row =>
        <li key={row.id}><span>{row.periodStart.slice(0, 10)} – {row.periodEnd.slice(0, 10)} · {row.cadence} · {row.recipientRole}</span><strong>{row.status}{row.errorCode ? ` · ${row.errorCode}` : ''}</strong></li>)}</ul>}
    </div>}
    {canManageSchedule && config && <div className={s.card}><h2>Sales summary schedule</h2>
      <p className={s.muted}>ANNIE owns scheduling and delivery. Changes are available to organization administrators.</p>
      {scheduleError && <p role="alert" className={s.error}>{scheduleError}</p>}
      <form onSubmit={event => void saveSchedule(event)}>
        <div className={s.filters}>
          <label>Enabled <input type="checkbox" disabled={!reportScheduleWriteEnabled} checked={config.setting?.enabled ?? false}
            onChange={event => updateSetting({ enabled: event.target.checked })} /></label>
          <label>Cadence <select disabled={!reportScheduleWriteEnabled} value={config.setting?.cadence ?? 'daily'}
            onChange={event => updateSetting({ cadence: event.target.value as 'daily' | 'weekly' })}>
            <option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
        </div>
        <fieldset disabled={!reportScheduleWriteEnabled}><legend>Recipient roles</legend>
          {(['SUPERADMIN', 'ADMINISTRATOR', 'SALES_MANAGER'] as const).map(role => <label key={role}>
            <input type="checkbox" checked={config.setting?.roles.includes(role) ?? role === 'SUPERADMIN'}
              onChange={event => { const roles = config.setting?.roles ?? ['SUPERADMIN'];
                updateSetting({ roles: event.target.checked ? [...roles, role] : roles.filter(value => value !== role) }) }} />
            {role === 'SALES_MANAGER' ? 'Sales managers' : role === 'ADMINISTRATOR' ? 'Administrators' : 'Superadmins'}
          </label>)}
        </fieldset>
        {reportScheduleWriteEnabled ? <button className={s.next} type="submit" disabled={scheduleBusy || !config.setting?.roles.length}>Save in ANNIE</button> :
          <p className={s.muted}>Schedule changes are not enabled in this release.</p>}
      </form>
    </div>}
  </>
}

function Social() {
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [conversations, setConversations] = useState<SocialConversation[]>([])
  const [health, setHealth] = useState('')
  const [providers, setProviders] = useState<SocialProvider[]>([])
  const [assets, setAssets] = useState<SocialAsset[]>([])
  const [leads, setLeads] = useState<SocialLead[]>([])
  const [selected, setSelected] = useState<SocialConversation | null>(null)
  const [events, setEvents] = useState<SocialEvent[]>([])
  const [eventError, setEventError] = useState('')
  const eventRequest = useRef(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    void Promise.allSettled([
      json<{ data: SocialConnection[] }>('meta/connections'),
      json<{ data: SocialConversation[] }>('meta/conversations'),
      json<{ data?: { mode?: string; webhooks?: string } }>('meta/status'),
      json<{ data: SocialProvider[] }>('social/providers'),
      json<{ data: SocialAsset[] }>('social/meta/assets'),
      json<{ data: SocialLead[] }>('meta/leads'),
    ]).then(([c, inbox, status, available, pageAssets, socialLeads]) => {
      if (cancelled) return
      if (c.status === 'fulfilled') setConnections(c.value.data ?? [])
      if (inbox.status === 'fulfilled') setConversations(inbox.value.data ?? [])
      if (status.status === 'fulfilled') setHealth(`Mode: ${status.value.data?.mode ?? 'Unavailable'} · Webhooks: ${status.value.data?.webhooks ?? 'Unavailable'}`)
      if (available.status === 'fulfilled') setProviders(available.value.data ?? [])
      if (pageAssets.status === 'fulfilled') setAssets(pageAssets.value.data ?? [])
      if (socialLeads.status === 'fulfilled') setLeads(socialLeads.value.data ?? [])
      if ([c, inbox, status, available, pageAssets, socialLeads].some(result => result.status === 'rejected'))
        setError('Some ANNIE Social sections are unavailable. Available sections remain visible.')
    })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])
  async function openConversation(conversation: SocialConversation) {
    const requestId = ++eventRequest.current
    setSelected(conversation); setEvents([]); setEventError('')
    try {
      const result = await json<{ data: SocialEvent[] }>(`meta/conversations/${conversation.id}/events`)
      if (requestId === eventRequest.current) setEvents(result.data ?? [])
    } catch (cause) { if (requestId === eventRequest.current)
      setEventError(cause instanceof Error ? cause.message : 'CONVERSATION_UNAVAILABLE') }
  }
  const messages = conversations.filter(conversation => conversation.kind !== 'comment')
  const comments = conversations.filter(conversation => conversation.kind === 'comment')
  const conversationList = (rows: SocialConversation[]) => rows.length ? <ul className={s.list}>{rows.map(conversation =>
    <li key={conversation.id}><div><button type="button" onClick={() => void openConversation(conversation)}>{conversation.connection?.pageName || conversation.channel} · {conversation.kind}</button>
      <small>{conversation.lastText || 'No message preview'} · {conversation.localEntityType ? 'Linked to CRM' : 'Not linked to CRM'}</small></div>
      <small>{conversation.unread ? 'Unread' : 'Read'}</small></li>)}</ul> : <p className={s.muted}>No items are available.</p>
  return <>
    {loading && <p role="status">Loading Social from ANNIE…</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {!loading && <><div className={s.card}><h2>Connection health</h2><p>{health || 'Unavailable'}</p><p className={s.muted}>Providers: {providers.map(provider => provider.id).join(', ') || 'None available'}</p></div>
      <div className={s.card}><div className={s.cardHeader}><h2>Connections</h2><span>{connections.length}</span></div>{connections.length ? <ul className={s.list}>{connections.map(connection => <li key={connection.id}>{connection.displayName ?? connection.pageName ?? connection.provider ?? 'Meta Page'} <small>{connection.status ?? 'Status unavailable'}</small></li>)}</ul> : <p className={s.muted}>No live Social connection is available yet.</p>}</div>
      <div className={s.card}><div className={s.cardHeader}><h2>Pages and accounts</h2><span>{assets.length}</span></div>{assets.length ? <ul className={s.list}>{assets.map(asset => <li key={asset.id}>{asset.label} <small>{asset.kind}</small></li>)}</ul> : <p className={s.muted}>No provider assets are available.</p>}</div>
      <div className={s.card}><div className={s.cardHeader}><h2>Messages</h2><span>{messages.length}</span></div>{conversationList(messages)}</div>
      <div className={s.card}><div className={s.cardHeader}><h2>Comments</h2><span>{comments.length}</span></div>{conversationList(comments)}</div>
      <div className={s.card}><div className={s.cardHeader}><h2>Social Leads</h2><span>{leads.length}</span></div>{leads.length ? <ul className={s.list}>{leads.map(lead =>
        <li key={lead.id}><span>{lead.leadName} <small>{lead.pageName || 'Meta Page'}</small></span><strong>{lead.status}</strong></li>)}</ul> : <p className={s.muted}>No ANNIE-visible Social Leads are available.</p>}</div>
      {selected && <aside className={s.detail}><div className={s.cardHeader}><h2>{selected.connection?.pageName || selected.channel} · {selected.kind}</h2><button type="button" onClick={() => { eventRequest.current++; setSelected(null) }}>Close</button></div>
        {eventError && <p role="alert" className={s.error}>{eventError}</p>}
        {events.length ? <ul className={s.list}>{events.map(event => <li key={event.id}><span>{event.text || 'Event without text'}</span><small>{event.at.slice(0, 16)} · {event.kind}</small></li>)}</ul> : !eventError && <p className={s.muted}>No events are available for this conversation.</p>}
      </aside>}
    </>}
  </>
}

export default function SalesExtendedViews({ tab, membershipQaEnabled = false, membershipWriteEnabled = false,
  canManageSchedule = false, reportScheduleWriteEnabled = false }: {
  tab: Tab; membershipQaEnabled?: boolean; membershipWriteEnabled?: boolean;
  canManageSchedule?: boolean; reportScheduleWriteEnabled?: boolean
}) {
  if (tab === 'memberships') return <Memberships membershipQaEnabled={membershipQaEnabled}
    membershipWriteEnabled={membershipWriteEnabled} />
  if (tab === 'reports') return <Reports canManageSchedule={canManageSchedule}
    reportScheduleWriteEnabled={reportScheduleWriteEnabled} />
  return <Social />
}
