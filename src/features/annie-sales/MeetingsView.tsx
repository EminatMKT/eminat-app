'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import { ownerLabel, type SalesDirectory } from './salesDirectory'
import s from './SalesModule.module.css'

type Meeting = {
  id: string; title: string; version: number; status: string; startAt: string; endAt: string
  timezone: string; organizerId: string; assigneeId: string; location?: string | null
  notes?: string | null; outcome?: string | null; leadId?: string | null
  contactId?: string | null; opportunityId?: string | null
}
type Related = { id: string; displayName?: string; name?: string }
type MeetingResult = { data?: Meeting[]; code?: string }
function meetingTime(instant: string, timezone: string, date: boolean) {
  try { return new Intl.DateTimeFormat(undefined, { timeZone: timezone,
    ...(date ? { year: 'numeric', month: 'short', day: 'numeric' } as const : {}),
    hour: 'numeric', minute: '2-digit' }).format(new Date(instant)) }
  catch { return 'Time unavailable' }
}

export default function MeetingsView({ directory, enabled, syntheticOnly }: {
  directory: SalesDirectory; enabled: boolean; syntheticOnly: boolean
}) {
  const [view, setView] = useState('upcoming')
  const [refresh, setRefresh] = useState(0)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [location, setLocation] = useState('')
  const [related, setRelated] = useState<{ leads: Related[]; contacts: Related[]; opportunities: Related[] }>(
    { leads: [], contacts: [], opportunities: [] })
  const [leadId, setLeadId] = useState('')
  const [contactId, setContactId] = useState('')
  const [opportunityId, setOpportunityId] = useState('')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Meeting | null>(null)
  const [status, setStatus] = useState('SCHEDULED')
  const [notes, setNotes] = useState('')
  const [outcome, setOutcome] = useState('')
  const key = useRef('')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [error, setError] = useState('')
  const [relatedError, setRelatedError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setRelatedError('')
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) throw new Error('SESSION_REQUIRED')
      const resources = ['leads', 'contacts', 'opportunities'] as const
      const rows = await Promise.all(resources.map(async resource => {
        const response = await fetch(`/api/integrations/annie/sales/${resource}?limit=100`, {
          cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!response.ok) throw new Error('RELATED_RECORDS_UNAVAILABLE')
        const body = await response.json() as { data?: Related[] }
        if (!Array.isArray(body.data)) throw new Error('RELATED_RECORDS_UNAVAILABLE')
        return body.data.filter(row => !syntheticOnly ||
          (row.displayName ?? row.name ?? '').startsWith('QA PHASE C '))
      }))
      if (!cancelled) setRelated({ leads: rows[0], contacts: rows[1], opportunities: rows[2] })
    }).catch(cause => { if (!cancelled) setRelatedError(cause instanceof Error ? cause.message : 'RELATED_RECORDS_UNAVAILABLE') })
    return () => { cancelled = true }
  }, [enabled, syntheticOnly])
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) throw new Error('SESSION_REQUIRED')
      const query = new URLSearchParams({ view, limit: '50',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' })
      const response = await fetch(`/api/integrations/annie/sales/extended/meetings?${query}`, {
        cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const body = await response.json() as MeetingResult
      if (!response.ok || !Array.isArray(body.data)) throw new Error(body.code ?? 'MEETINGS_UNAVAILABLE')
      if (!cancelled) setMeetings(body.data)
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'MEETINGS_UNAVAILABLE') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [view, refresh])
  async function create(event: React.FormEvent) {
    event.preventDefault()
    if (!enabled || !title.trim() || !assigneeId || !start || !end ||
        (syntheticOnly && !title.startsWith('QA PHASE C '))) return
    const startAt = new Date(start), endAt = new Date(end)
    if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) {
      setError('End time must be after start time.'); return
    }
    setBusy(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('SESSION_REQUIRED')
      if (!key.current) key.current = crypto.randomUUID()
      const response = await fetch('/api/integrations/annie/sales/meetings', {
        method: 'POST', cache: 'no-store',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json',
          'Idempotency-Key': key.current },
        body: JSON.stringify({ title: title.trim(), assigneeId, participants: [],
          startAt: startAt.toISOString(), endAt: endAt.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          location: location.trim() || null,
          ...(leadId ? { leadId } : {}), ...(contactId ? { contactId } : {}),
          ...(opportunityId ? { opportunityId } : {}) }),
      })
      const body = await response.json() as { code?: string }
      if (!response.ok) throw new Error(body.code ?? 'MEETING_CREATE_FAILED')
      key.current = ''; setCreating(false); setRefresh(value => value + 1)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'MEETING_CREATE_FAILED') }
    finally { setBusy(false) }
  }
  async function update(event: React.FormEvent) {
    event.preventDefault()
    if (!selected || !enabled || !Number.isSafeInteger(selected.version) || selected.version < 1 ||
        (syntheticOnly && !selected.title.startsWith('QA PHASE C '))) return
    setBusy(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('SESSION_REQUIRED')
      const response = await fetch(`/api/integrations/annie/sales/meetings/${selected.id}`, {
        method: 'PATCH', cache: 'no-store',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json',
          'X-Annie-Expected-Version': String(selected.version) },
        body: JSON.stringify({ status, notes: notes.trim() || null, outcome: outcome.trim() || null }),
      })
      const body = await response.json() as { code?: string }
      if (!response.ok) throw new Error(body.code ?? 'MEETING_UPDATE_FAILED')
      setSelected(null); setRefresh(value => value + 1)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'MEETING_UPDATE_FAILED') }
    finally { setBusy(false) }
  }
  return <section className={s.card} aria-label="ANNIE meetings">
    <div className={s.cardHeader}><h2>Meetings</h2><label>View <select value={view} onChange={event => setView(event.target.value)}>
      {['upcoming', 'today', 'overdue', 'completed', 'all'].map(value =>
        <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
    </select></label></div>
    {enabled && <button type="button" onClick={() => { key.current = ''; setError(''); setCreating(true);
      setTitle(syntheticOnly ? 'QA PHASE C ' : ''); setAssigneeId(''); setStart(''); setEnd(''); setLocation('');
      setLeadId(''); setContactId(''); setOpportunityId('') }}>
      Create {syntheticOnly ? 'synthetic ' : ''}meeting
    </button>}
    {creating && <form onSubmit={event => void create(event)}>
      <p className={s.muted}>Times use your device timezone. ANNIE validates the schedule and staff assignment.</p>
      {relatedError && <p role="alert" className={s.error}>Related records unavailable; meeting can still be saved without a link.</p>}
      <label>Title <input required maxLength={240} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>Assignee <select required value={assigneeId} onChange={event => setAssigneeId(event.target.value)}>
        <option value="">Select staff member</option>
        {directory.users?.filter(user => ['SUPERADMIN', 'ADMINISTRATOR', 'SALES_MANAGER', 'OPERATOR'].includes(user.role))
          .map(user => <option key={user.principalId} value={user.principalId}>{ownerLabel(directory, user.principalId)}</option>)}
      </select></label>
      <label>Start <input type="datetime-local" required value={start} onChange={event => setStart(event.target.value)} /></label>
      <label>End <input type="datetime-local" required value={end} onChange={event => setEnd(event.target.value)} /></label>
      <label>Location <input maxLength={500} value={location} onChange={event => setLocation(event.target.value)} /></label>
      <label>Related Lead <select value={leadId} onChange={event => setLeadId(event.target.value)}><option value="">None</option>
        {related.leads.map(row => <option key={row.id} value={row.id}>{row.displayName ?? row.name}</option>)}
      </select></label>
      <label>Related Contact <select value={contactId} onChange={event => setContactId(event.target.value)}><option value="">None</option>
        {related.contacts.map(row => <option key={row.id} value={row.id}>{row.displayName ?? row.name}</option>)}
      </select></label>
      <label>Related Opportunity <select value={opportunityId} onChange={event => setOpportunityId(event.target.value)}><option value="">None</option>
        {related.opportunities.map(row => <option key={row.id} value={row.id}>{row.name ?? row.displayName}</option>)}
      </select></label>
      <button type="submit" disabled={busy || !title.trim() || !assigneeId || !start || !end ||
        (syntheticOnly && !title.startsWith('QA PHASE C '))}>Save in ANNIE</button>
      <button type="button" onClick={() => setCreating(false)}>Cancel</button>
    </form>}
    {selected && <form onSubmit={event => void update(event)}>
      <h3>{selected.title}</h3>
      <label>Status <select value={status} onChange={event => setStatus(event.target.value)}>
        {['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map(value =>
          <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
      </select></label>
      <label>Notes <textarea maxLength={4000} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      <label>Outcome <textarea maxLength={4000} value={outcome} onChange={event => setOutcome(event.target.value)} /></label>
      <button type="submit" disabled={busy}>Save in ANNIE</button>
      <button type="button" onClick={() => setSelected(null)}>Cancel</button>
    </form>}
    {loading && <p role="status">Loading meetings…</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {!loading && !error && (meetings.length ? <ul className={s.list}>{meetings.map(meeting =>
      <li key={meeting.id}><div><strong>{meeting.title}</strong><small>{meeting.status} ·
        {' '}{meetingTime(meeting.startAt, meeting.timezone, true)} – {meetingTime(meeting.endAt, meeting.timezone, false)}
        {' '}{meeting.timezone}</small></div>
        <small>{ownerLabel(directory, meeting.assigneeId)}{meeting.location ? ` · ${meeting.location}` : ''}
          {meeting.leadId ? ' · Lead linked' : ''}{meeting.contactId ? ' · Contact linked' : ''}
          {meeting.opportunityId ? ' · Opportunity linked' : ''}
          {enabled && (!syntheticOnly || meeting.title.startsWith('QA PHASE C ')) &&
            <button type="button" onClick={() => { setSelected(meeting); setStatus(meeting.status);
              setNotes(meeting.notes ?? ''); setOutcome(meeting.outcome ?? ''); setError('') }}>Manage</button>}
        </small></li>)}</ul>
      : <p className={s.muted}>No meetings in this view.</p>)}
  </section>
}
