'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import AppShell from '@/shared/components/shell/AppShell'
import { supabase } from '@/shared/db/supabase'
import NativeSalesCreate from './NativeSalesCreate'
import NativeSalesImport from './NativeSalesImport'
import NativeSalesRecordActions from './NativeSalesRecordActions'
import NativeReportSchedules from './NativeReportSchedules'
import NativeMembershipFamily from './NativeMembershipFamily'
import NativeMembershipIssue from './NativeMembershipIssue'
import NativeMembershipRenewal from './NativeMembershipRenewal'
import NativeSalesEmail from './NativeSalesEmail'
import NativeGeneralTask from './NativeGeneralTask'
import NativeSocialStatus from './NativeSocialStatus'
import NativeSocialInbox from './NativeSocialInbox'
import s from './NativeSalesModule.module.css'

type Tab = 'dashboard' | 'leads' | 'contacts' | 'accounts' | 'opportunities' |
  'pipeline' | 'activities' | 'memberships' | 'reports' | 'social' | 'settings'
type Access = { allowed: boolean; role: string; capabilities: { canWrite: boolean; canReassign: boolean; canConfigureReports:boolean } }
type Person = { memberId: string; displayName: string; role: string; teamIds: string[] }
type Team = { id: string; name: string }
type Stage = { id: string; code: string; name: string; position: number; outcome: string; pipelineId: string }
type Directory = { users: Person[]; historicalUsers: Pick<Person, 'memberId' | 'displayName'>[];
  teams: Team[]; stages: Stage[] }
type Row = Record<string, unknown> & { id: string }
export type NativeRequest = (path: string, options?: { method?: 'POST' | 'PATCH';
  payload?: Record<string, unknown>; version?: number; idempotencyKey?: string }) => Promise<Record<string, unknown>>
type TimelineEvent = { id: string; type: string; action?: string; kind?: string;
  title?: string; body?: string; actorName?: string; occurredAt?: string }
type Summary = {
  asOf: string
  scope: string
  leads: { total: number; byStatus: { code: string; count: number }[] }
  opportunities: { total: number; byStage: { code: string; label: string; outcome: string; count: number }[];
    won: number; lost: number; open: number; openByCurrency: { currency: string; amount: string }[] }
}
type CountRow = { code: string; count: number; label?: string; outcome?: string }
type DetailReport = {
  generatedAt: string; range: { from: string; to: string }; scope: string
  leads: { total: number; converted: number; conversionRate: number; unresponsive: number;
    byStage: CountRow[]; bySource: CountRow[];
    bySeller: { memberId: string; label: string; count: number; converted: number; conversionRate: number }[] }
  opportunities: { total: number; won: number; lost: number; byStage: CountRow[] }
  memberships: { sold: number; byPlan: CountRow[]; byModality: CountRow[];
    salesBySeller: { memberId: string; label: string; currency: string; count: number; amount: string }[] }
  activities: { total: number; followUps: number; byKind: CountRow[] }
}
const todayUtc = () => new Date().toISOString().slice(0,10)
const monthAgoUtc = () => { const day = new Date(); day.setUTCMonth(day.getUTCMonth()-1); return day.toISOString().slice(0,10) }
const tabs: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' }, { key: 'leads', label: 'Leads' },
  { key: 'contacts', label: 'Contacts' }, { key: 'accounts', label: 'Accounts' },
  { key: 'opportunities', label: 'Opportunities' }, { key: 'pipeline', label: 'Pipeline' },
  { key: 'activities', label: 'Activities' }, { key: 'memberships', label: 'Memberships' },
  { key: 'reports', label: 'Reports' }, { key: 'social', label: 'Social' },
  { key: 'settings', label: 'Sales Settings' },
]
const listTabs = new Set<Tab>(['leads', 'contacts', 'accounts', 'opportunities', 'memberships', 'activities'])
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const string = (value: unknown) => typeof value === 'string' ? value : ''
const date = (value: unknown) => typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : ''
const title = (row: Row) => string(row.display_name) || string(row.name) ||
  [string(row.first_name), string(row.last_name)].filter(Boolean).join(' ') ||
  string(row.relatedName) || string(row.subject) || string(row.code) || 'Untitled'

export default function NativeSalesModule({ organizationId }: { organizationId: string }) {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [access, setAccess] = useState<Access | null>(null)
  const [directory, setDirectory] = useState<Directory>({ users: [], historicalUsers: [], teams: [], stages: [] })
  const [summary, setSummary] = useState<Summary | null>(null)
  const [detailReport, setDetailReport] = useState<DetailReport | null>(null)
  const [reportFrom, setReportFrom] = useState(monthAgoUtc)
  const [reportTo, setReportTo] = useState(todayUtc)
  const [rows, setRows] = useState<Row[]>([])
  const [selected, setSelected] = useState<Row | null>(null)
  const [pipelineStage, setPipelineStage] = useState('')
  const [draggedOpportunityId, setDraggedOpportunityId] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [timelineError, setTimelineError] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [query, setQuery] = useState('')
  const [demo, setDemo] = useState('all')
  const [leadView, setLeadView] = useState<'active'|'archived'>('active')
  const [selectedLeadIds,setSelectedLeadIds] = useState<string[]>([])
  const [bulkOwner,setBulkOwner] = useState('')
  const [bulkTeam,setBulkTeam] = useState('')
  const [bulkBusy,setBulkBusy] = useState(false)
  const [bulkError,setBulkError] = useState('')
  const [offset, setOffset] = useState(0)
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  const request: NativeRequest = useCallback(async (path, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('AUTHENTICATION_REQUIRED')
    const headers: Record<string,string> = { Authorization: `Bearer ${session.access_token}`,
      'X-Sales-Organization-Id': organizationId }
    if (options.payload) headers['Content-Type'] = 'application/json'
    if (options.version) headers['If-Match'] = String(options.version)
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey
    const response = await fetch(`/api/sales-native/${path}`, { cache: 'no-store',
      method: options.method || 'GET', headers,
      body: options.payload ? JSON.stringify(options.payload) : undefined })
    const result = await response.json().catch(() => null) as unknown
    if (!isObject(result)) throw new Error('SALES_RESPONSE_UNAVAILABLE')
    if (!response.ok) throw new Error(string(result.code) || 'SALES_UNAVAILABLE')
    return result
  }, [organizationId])

  useEffect(() => {
    let cancelled = false
    Promise.all([request('access'), request('directory')]).then(([gate, lookup]) => {
      if (cancelled) return
      setAccess(gate as Access)
      const data = lookup.data
      if (isObject(data)) setDirectory({
        users: Array.isArray(data.users) ? data.users as Person[] : [],
        historicalUsers: Array.isArray(data.historicalUsers)
          ? data.historicalUsers as Directory['historicalUsers'] : [],
        teams: Array.isArray(data.teams) ? data.teams as Team[] : [],
        stages: Array.isArray(data.stages) ? data.stages as Stage[] : [],
      })
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'SALES_UNAVAILABLE') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [request])

  useEffect(() => { setRows([]); setSelected(null); setCreateOpen(false); setImportOpen(false); setOffset(0);
    setNextOffset(null);setSelectedLeadIds([]);setBulkError('') }, [tab, query, demo, leadView])
  useEffect(() => {
    const resource = tab==='pipeline' ? 'opportunities' : tab
    if (!selected || !['leads','contacts','accounts','opportunities'].includes(resource)) {
      setTimeline([]); setTimelineError(false); return
    }
    let cancelled = false
    setTimeline([]); setTimelineError(false)
    void request(`timeline?${new URLSearchParams({ resource, id: selected.id, limit: '25' })}`)
      .then(result => { if (!cancelled) setTimeline(Array.isArray(result.data)
        ? result.data as TimelineEvent[] : []) })
      .catch(() => { if (!cancelled) setTimelineError(true) })
    return () => { cancelled = true }
  }, [selected, tab, request])
  useEffect(() => {
    if (!access?.allowed || tab === 'social' || tab === 'settings') return
    let cancelled = false
    const load = async () => {
      setLoading(true); setError('')
      try {
        if (tab === 'dashboard') {
          const result = await request('reports/summary')
          if (!cancelled && isObject(result.data)) setSummary(result.data as Summary)
          return
        }
        if (tab === 'reports') {
          if (reportTo < reportFrom) throw new Error('INVALID_PERIOD')
          const result = await request(`reports/detail?${new URLSearchParams({ from: reportFrom, to: reportTo })}`)
          if (!cancelled && isObject(result.data)) setDetailReport(result.data as DetailReport)
          return
        }
        if (tab === 'pipeline') {
          const result = await request('opportunities?limit=100')
          if (!cancelled) {
            setRows(Array.isArray(result.data) ? result.data as Row[] : [])
            setNextOffset(typeof result.nextOffset === 'number' ? result.nextOffset : null)
          }
          return
        }
        if (!listTabs.has(tab)) return
        const params = new URLSearchParams({ limit: '25', offset: String(offset) })
        if (query && tab !== 'activities') params.set('q', query)
        if (tab === 'memberships' && demo !== 'all') params.set('demo', demo)
        const path = tab === 'activities' ? `activities/inbox?${new URLSearchParams({ limit: '25', offset: String(offset) })}` :
          tab === 'leads' && leadView === 'archived' ? `leads/archived?${params}` : `${tab}?${params}`
        const result = await request(path)
        if (!cancelled) {
          setRows(Array.isArray(result.data) ? result.data as Row[] : [])
          setNextOffset(typeof result.nextOffset === 'number' ? result.nextOffset : null)
        }
      } catch (cause) { if (!cancelled) {
        setError(cause instanceof Error ? cause.message : 'SALES_UNAVAILABLE')
        setRows([]); setSummary(null); setDetailReport(null)
      } }
      finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [access?.allowed, tab, query, demo, leadView, offset, refresh, reportFrom, reportTo, request])

  const userName = useCallback((id: unknown) => directory.users.find(user => user.memberId === id)?.displayName ||
    directory.historicalUsers.find(user => user.memberId === id)?.displayName || 'Unassigned',
    [directory.users, directory.historicalUsers])
  const teamName = useCallback((id: unknown) => directory.teams.find(team => team.id === id)?.name || '', [directory.teams])
  const stageName = useCallback((id: unknown) => directory.stages.find(stage => stage.id === id)?.name || '', [directory.stages])
  const openMembershipPdf = useCallback(async (row: Row, download: boolean) => {
    const viewer = download ? null : window.open('', '_blank')
    setPdfBusy(true); setPdfError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('AUTHENTICATION_REQUIRED')
      const response = await fetch(`/api/sales-native/memberships/${row.id}/pdf${download ? '?download=1' : ''}`,
        { cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}`,
          'X-Sales-Organization-Id': organizationId } })
      if (!response.ok) {
        const result = await response.json().catch(() => null) as unknown
        throw new Error(isObject(result) ? string(result.code) || 'PDF_UNAVAILABLE' : 'PDF_UNAVAILABLE')
      }
      const objectUrl = URL.createObjectURL(await response.blob())
      if (download) {
        const anchor = document.createElement('a')
        anchor.href = objectUrl
        anchor.download = `corazon-salud-${string(row.code).replace(/[^A-Za-z0-9_-]/g,'_') || 'membership'}.pdf`
        document.body.append(anchor); anchor.click(); anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
      } else if (viewer) {
        viewer.location.href = objectUrl
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 300_000)
      } else {
        URL.revokeObjectURL(objectUrl)
        throw new Error('POPUP_BLOCKED')
      }
    } catch (cause) {
      viewer?.close()
      setPdfError(cause instanceof Error ? cause.message : 'PDF_UNAVAILABLE')
    } finally { setPdfBusy(false) }
  }, [organizationId])
  const stages = useMemo(() => [...directory.stages].sort((a,b) => a.position-b.position), [directory.stages])
  const currentLabel = tabs.find(item => item.key === tab)?.label || 'Sales'
  const moveOpportunity = useCallback(async (row: Row, target: Stage) => {
    const source = directory.stages.find(stage => stage.id===row.stage_id)
    if (!source || source.pipelineId!==target.pipelineId || source.id===target.id) return
    if (target.outcome!=='OPEN') { setPipelineStage(target.code); setSelected(row); return }
    setError('')
    try {
      await request(`opportunities/${row.id}/transitions`,{method:'POST',
        payload:{stageCode:target.code},version:Number(row.version)})
      setRefresh(value => value+1)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'STAGE_UPDATE_FAILED') }
  }, [directory.stages,request])
  const bulkReassign = useCallback(async () => {
    const items=rows.filter(row => selectedLeadIds.includes(row.id)).map(row =>
      ({id:row.id,version:Number(row.version)}))
    if (!items.length || !bulkOwner || items.some(item => !Number.isSafeInteger(item.version) || item.version<1)) return
    setBulkBusy(true);setBulkError('')
    try {
      await request('leads/bulk-reassign',{method:'POST',payload:{items,ownerMemberId:bulkOwner,teamId:bulkTeam || null}})
      setSelectedLeadIds([]);setRefresh(value => value+1)
    } catch (cause) { setBulkError(cause instanceof Error ? cause.message : 'REASSIGN_FAILED') }
    finally { setBulkBusy(false) }
  },[rows,selectedLeadIds,bulkOwner,bulkTeam,request])

  return <AppShell title="Sales" actions={<span className={s.role}>{access?.role || 'Loading'}</span>}>
    <main className={s.main}>
      <div className={s.heading}><div><p className={s.eyebrow}>LILLY Sales</p><h1>{currentLabel}</h1></div>
        <div className={s.headingActions}>
          {access?.capabilities.canWrite && ['leads','contacts','accounts','opportunities','memberships','activities'].includes(tab) &&
            !(tab==='leads' && leadView==='archived') &&
            <button className={s.refresh} type="button" onClick={() => setCreateOpen(value => !value)}>{createOpen ? 'Cancel' : 'Add new'}</button>}
          {access?.capabilities.canWrite && (tab==='leads' && leadView==='active' || tab==='contacts') &&
            <button className={s.refresh} type="button" onClick={() => setImportOpen(value => !value)}>{importOpen ? 'Close import' : 'Import'}</button>}
          <button className={s.refresh} type="button" onClick={() => {setSelectedLeadIds([]);setRefresh(value => value+1)}} disabled={loading}>Refresh</button>
        </div>
      </div>
      <nav className={s.tabs} aria-label="Sales sections">
        {tabs.map(item => <button key={item.key} type="button" aria-current={tab===item.key ? 'page' : undefined}
          className={tab===item.key ? s.active : ''} onClick={() => { setTab(item.key); setQuery('') }}>
          {item.label}</button>)}
      </nav>
      {!access?.allowed && !loading && <p role="alert" className={s.error}>{error || 'Sales access is unavailable.'}</p>}
      {access?.allowed && <>
        {importOpen && (tab==='leads' || tab==='contacts') &&
          <NativeSalesImport key={tab} resource={tab} organizationId={organizationId}
            onComplete={() => { setImportOpen(false); setRefresh(value => value + 1) }} />}
        {createOpen && ['leads','contacts','accounts','opportunities'].includes(tab) &&
          <NativeSalesCreate resource={tab as 'leads'|'contacts'|'accounts'|'opportunities'} request={request}
            onSaved={() => { setCreateOpen(false); setRefresh(value => value+1) }} />}
        {createOpen && tab==='memberships' && <NativeMembershipIssue request={request} role={access.role}
          onSaved={() => {setCreateOpen(false);setRefresh(value => value+1)}} />}
        {createOpen && tab==='activities' && <NativeGeneralTask request={request}
          onSaved={() => {setCreateOpen(false);setRefresh(value => value+1)}} />}
        {error && <p role="alert" className={s.error}>{error}</p>}
        {loading && <p role="status" className={s.empty}>Loading {currentLabel.toLowerCase()}…</p>}
        {tab==='dashboard' && summary && !loading && !error && <>
          <div className={s.metrics}>
            <Metric label="Leads" value={summary.leads.total} />
            <Metric label="Open opportunities" value={summary.opportunities.open} />
            <Metric label="Won" value={summary.opportunities.won} />
            <Metric label="Lost" value={summary.opportunities.lost} />
          </div>
          <div className={s.reportGrid}>
            <section className={s.panel}><h2>Leads by stage</h2><Breakdown rows={summary.leads.byStatus} /></section>
            <section className={s.panel}><h2>Opportunities by stage</h2><Breakdown rows={summary.opportunities.byStage} /></section>
          </div>
          <p className={s.caption}>Scope: {summary.scope === 'organization' ? 'Organization' : 'Your permitted records'} · Updated {date(summary.asOf)}</p>
        </>}
        {tab==='reports' && <div className={s.filters}>
          <label>From <input type="date" value={reportFrom} onChange={event => setReportFrom(event.target.value)} /></label>
          <label>To <input type="date" value={reportTo} onChange={event => setReportTo(event.target.value)} /></label>
        </div>}
        {tab==='reports' && detailReport && !loading && !error && <>
          <div className={s.metrics}>
            <Metric label="Leads" value={detailReport.leads.total} />
            <Metric label="Converted" value={detailReport.leads.converted} />
            <Metric label="Won" value={detailReport.opportunities.won} />
            <Metric label="Lost" value={detailReport.opportunities.lost} />
            <Metric label="Memberships sold" value={detailReport.memberships.sold} />
            <Metric label="Activities" value={detailReport.activities.total} />
          </div>
          <p className={s.caption}>Lead conversion {detailReport.leads.conversionRate}% · Unresponsive {detailReport.leads.unresponsive} · Follow-ups {detailReport.activities.followUps}</p>
          <div className={s.reportGrid}>
            <section className={s.panel}><h2>Leads by stage</h2><Breakdown rows={detailReport.leads.byStage} /></section>
            <section className={s.panel}><h2>Leads by source</h2><Breakdown rows={detailReport.leads.bySource} /></section>
            <section className={s.panel}><h2>Leads by seller</h2><SellerBreakdown rows={detailReport.leads.bySeller} /></section>
            <section className={s.panel}><h2>Opportunities by stage</h2><Breakdown rows={detailReport.opportunities.byStage} /></section>
            <section className={s.panel}><h2>Memberships by plan</h2><Breakdown rows={detailReport.memberships.byPlan} /></section>
            <section className={s.panel}><h2>Memberships by modality</h2><Breakdown rows={detailReport.memberships.byModality} /></section>
            <section className={s.panel}><h2>Sales by seller</h2><ul className={s.breakdown}>{detailReport.memberships.salesBySeller.map(row =>
              <li key={`${row.memberId}-${row.currency}`}><span>{row.label} · {row.currency}</span><strong>{row.count} · {row.amount}</strong></li>)}</ul></section>
            <section className={s.panel}><h2>Activity by kind</h2><Breakdown rows={detailReport.activities.byKind} /></section>
          </div>
          <p className={s.caption}>Scope: {detailReport.scope==='organization' ? 'Organization' : 'Your permitted records'} · Updated {date(detailReport.generatedAt)}</p>
        </>}
        {tab==='pipeline' && !loading && <>
          <p className={s.hint}>Swipe sideways to view every stage.</p>
          <div className={s.board} tabIndex={0} aria-label="Opportunity pipeline">
            {stages.map(stage => <section key={stage.id} className={s.column}
              onDragOver={event => { if (access.capabilities.canWrite) event.preventDefault() }}
              onDrop={event => { event.preventDefault(); const row=rows.find(item => item.id===draggedOpportunityId)
                setDraggedOpportunityId(''); if (row) void moveOpportunity(row,stage) }}>
              <h2>{stage.name} <small>{rows.filter(row => row.stage_id===stage.id).length}</small></h2>
              {rows.filter(row => row.stage_id===stage.id).map(row => <button key={row.id} type="button" className={s.pipelineCard}
                draggable={access.capabilities.canWrite}
                onDragStart={() => setDraggedOpportunityId(row.id)} onDragEnd={() => setDraggedOpportunityId('')}
                onClick={() => { setPipelineStage(''); setSelected(row) }}>
                <strong>{title(row)}</strong><span>{userName(row.owner_member_id)}</span>
                <small>{string(row.currency)} {row.amount === null ? '—' : String(row.amount ?? '—')}</small>
              </button>)}
            </section>)}
          </div>
          {nextOffset !== null && <p className={s.caption}>More opportunities exist. Use the Opportunities list to page through them.</p>}
        </>}
        {listTabs.has(tab) && !loading && <>
          {tab!=='activities' && <div className={s.filters}>
            <label>Search <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or code" /></label>
            {tab==='leads' && access.capabilities.canReassign && <label>Lead view <select value={leadView}
              onChange={event => setLeadView(event.target.value as 'active'|'archived')}>
              <option value="active">Active</option><option value="archived">Archived</option>
            </select></label>}
            {tab==='memberships' && <label>Records <select value={demo} onChange={event => setDemo(event.target.value)}>
              <option value="all">All</option><option value="false">Commercial</option><option value="true">Demo</option>
            </select></label>}
          </div>}
          {tab==='leads' && leadView==='active' && access.capabilities.canReassign && selectedLeadIds.length>0 &&
            <form className={`${s.panel} ${s.form}`} onSubmit={event => {event.preventDefault();void bulkReassign()}}>
              <h2>Assign {selectedLeadIds.length} selected Lead{selectedLeadIds.length===1 ? '' : 's'}</h2>
              <div className={s.formGrid}>
                <label>Owner <select required value={bulkOwner} onChange={event => {setBulkOwner(event.target.value);setBulkTeam('')}}>
                  <option value="">Choose a person</option>{directory.users.map(user =>
                    <option key={user.memberId} value={user.memberId}>{user.displayName}</option>)}
                </select></label>
                <label>Team <select required={access.role==='SALES_MANAGER'} value={bulkTeam} onChange={event => setBulkTeam(event.target.value)}>
                  <option value="">No team</option>{directory.teams.filter(team =>
                    directory.users.find(user => user.memberId===bulkOwner)?.teamIds.includes(team.id)).map(team =>
                    <option key={team.id} value={team.id}>{team.name}</option>)}
                </select></label>
              </div><button type="submit" disabled={bulkBusy || !bulkOwner}>Assign selected</button>
              {bulkError && <p role="alert" className={s.error}>{bulkError}</p>}
            </form>}
          {rows.length ? <div className={s.list}>{rows.map(row => <div key={row.id} className={s.itemRow}>
            {tab==='leads' && leadView==='active' && access.capabilities.canReassign &&
              <input type="checkbox" aria-label={`Select ${title(row)}`} checked={selectedLeadIds.includes(row.id)}
                onChange={event => setSelectedLeadIds(ids => event.target.checked ? [...ids,row.id] : ids.filter(id => id!==row.id))} />}
            <button type="button" className={s.item} onClick={() => {setPipelineStage('');setSelected(row)}}>
            <span><strong>{title(row)}</strong><small>{tab==='opportunities' ? stageName(row.stage_id) :
              tab==='activities' ? `${string(row.kind)} · ${string(row.relatedName)}` :
              tab==='memberships' ? `${string(row.plan)} · ${string(row.duration)}` :
              string(row.status) || string(row.type) || string(row.source)}</small></span>
            <span className={s.meta}>{tab==='activities' ? date(row.due_at) :
              tab==='memberships' ? string(row.effectiveStatus) : userName(row.owner_member_id)}</span>
            </button></div>)}</div> : <p className={s.empty}>No records in this view.</p>}
          <div className={s.pager}><button type="button" disabled={offset===0} onClick={() => {setSelectedLeadIds([]);setOffset(Math.max(0,offset-25))}}>Previous</button>
            <span>Page {Math.floor(offset/25)+1}</span><button type="button" disabled={nextOffset===null} onClick={() => {setSelectedLeadIds([]);setOffset(nextOffset ?? offset)}}>Next</button></div>
        </>}
        {tab==='social' && <><NativeSocialStatus request={request} role={access.role} />
          <NativeSocialInbox request={request} /></>}
        {tab==='settings' && <div className={s.reportGrid}>
          <section className={s.panel}><h2>Team</h2>{directory.teams.map(team => <p key={team.id}>{team.name}</p>)}</section>
          <section className={s.panel}><h2>People</h2>{directory.users.map(user => <p key={user.memberId}>{user.displayName} · {user.role}</p>)}</section>
          {access.capabilities.canConfigureReports && <NativeReportSchedules request={request} />}
        </div>}
        {selected && <div className={s.overlay} role="presentation" onMouseDown={event => { if (event.target===event.currentTarget) setSelected(null) }}>
          <section className={s.detail} role="dialog" aria-modal="true" aria-label={title(selected)}>
            <div className={s.detailHeader}><h2>{title(selected)}</h2><button type="button" onClick={() => {setSelected(null);setPipelineStage('')}} aria-label="Close details">×</button></div>
            <dl><dt>Status</dt><dd>{string(selected.effectiveStatus) || string(selected.status) || stageName(selected.stage_id) || '—'}</dd>
              <dt>Owner</dt><dd>{userName(selected.owner_member_id || selected.seller_member_id)}</dd>
              <dt>Team</dt><dd>{teamName(selected.team_id) || '—'}</dd>
              <dt>Created</dt><dd>{date(selected.created_at) || '—'}</dd>
              {selected.email && <><dt>Email</dt><dd>{string(selected.email)}</dd></>}
              {selected.code && <><dt>Membership code</dt><dd>{string(selected.code)}</dd></>}
            </dl>
            {tab==='memberships' && <><div className={s.pdfActions}>
              <button type="button" disabled={pdfBusy} onClick={() => void openMembershipPdf(selected,false)}>View / print PDF</button>
              <button type="button" disabled={pdfBusy} onClick={() => void openMembershipPdf(selected,true)}>Download PDF</button>
            </div>{pdfError && <p role="alert" className={s.error}>{pdfError}</p>}
              <NativeMembershipFamily membershipId={selected.id} membershipType={string(selected.membership_type)}
                household={Array.isArray(selected.household) ? selected.household as {
                  id: string; displayName: string; relationship: string; status: string; code?: string
                }[] : []} role={access.role} request={request}
                onSaved={() => {void request(`memberships/${selected.id}`).then(result => {
                  if (isObject(result.data)) setSelected(result.data as Row)
                  setRefresh(value => value+1)
                }).catch(() => setRefresh(value => value+1))}} />
              <NativeMembershipRenewal membershipId={selected.id} currentPlan={string(selected.plan)}
                currentDuration={string(selected.duration)} expiresAt={string(selected.expires_at)}
                role={access.role} request={request} /></>}
            {timeline.length>0 && <div className={s.timeline}><h3>Timeline</h3><ol>{timeline.map(event =>
              <li key={event.id}><strong>{event.type==='activity' ? event.title || event.kind : event.action}</strong>
                <small>{event.actorName || 'System'} · {date(event.occurredAt)}</small>
                {event.type==='activity' && event.body && <p>{event.body}</p>}</li>)}</ol></div>}
            {timelineError && <p role="alert" className={s.error}>Timeline is temporarily unavailable.</p>}
            {['leads','contacts','accounts','opportunities','pipeline','activities'].includes(tab) &&
              <NativeSalesRecordActions key={`${tab}-${selected.id}-${pipelineStage}`} resource={tab==='pipeline' ? 'opportunities' :
                tab as 'leads'|'contacts'|'accounts'|'opportunities'|'activities'} row={selected}
                canWrite={Boolean(access.capabilities.canWrite)} canReassign={Boolean(access.capabilities.canReassign)}
                stages={directory.stages} users={directory.users} teams={directory.teams} request={request}
                requestedStage={pipelineStage}
                onSaved={() => { setSelected(null); setRefresh(value => value+1) }} />}
            {['leads','contacts','accounts'].includes(tab) && access.capabilities.canWrite &&
              Boolean(string(selected.email)) && selected.do_not_email!==true &&
              <NativeSalesEmail resource={tab as 'leads'|'contacts'|'accounts'} recordId={selected.id}
                recipient={string(selected.email)} request={request}
                onSent={() => setSelected(current => current ? {...current} : current)} />}
          </section>
        </div>}
      </>}
    </main>
  </AppShell>
}

function Metric({ label, value }: { label: string; value: number }) {
  return <section className={s.metric}><p>{label}</p><strong>{value.toLocaleString()}</strong></section>
}
function Breakdown({ rows }: { rows: { code: string; count: number }[] }) {
  if (!rows.length) return <p className={s.empty}>No records yet.</p>
  return <ul className={s.breakdown}>{rows.map(row => <li key={row.code}><span>{row.code.replaceAll('_',' ')}</span><strong>{row.count}</strong></li>)}</ul>
}
function SellerBreakdown({ rows }: { rows: DetailReport['leads']['bySeller'] }) {
  if (!rows.length) return <p className={s.empty}>No records yet.</p>
  return <ul className={s.breakdown}>{rows.map(row =>
    <li key={row.memberId}><span>{row.label}</span><strong>{row.count} · {row.conversionRate}%</strong></li>)}</ul>
}
