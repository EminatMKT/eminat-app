'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import { ownerLabel, type SalesDirectory } from './salesDirectory'
import s from './SalesModule.module.css'

type Meeting = {
  id: string; title: string; status: string; startAt: string; endAt: string
  timezone: string; organizerId: string; assigneeId: string; location?: string | null
}
type MeetingResult = { data?: Meeting[]; code?: string }
function meetingTime(instant: string, timezone: string, date: boolean) {
  try { return new Intl.DateTimeFormat(undefined, { timeZone: timezone,
    ...(date ? { year: 'numeric', month: 'short', day: 'numeric' } as const : {}),
    hour: 'numeric', minute: '2-digit' }).format(new Date(instant)) }
  catch { return 'Time unavailable' }
}

export default function MeetingsView({ directory }: { directory: SalesDirectory }) {
  const [view, setView] = useState('upcoming')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
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
  }, [view])
  return <section className={s.card} aria-label="ANNIE meetings">
    <div className={s.cardHeader}><h2>Meetings</h2><label>View <select value={view} onChange={event => setView(event.target.value)}>
      {['upcoming', 'today', 'overdue', 'completed', 'all'].map(value =>
        <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
    </select></label></div>
    {loading && <p role="status">Loading meetings…</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {!loading && !error && (meetings.length ? <ul className={s.list}>{meetings.map(meeting =>
      <li key={meeting.id}><div><strong>{meeting.title}</strong><small>{meeting.status} ·
        {' '}{meetingTime(meeting.startAt, meeting.timezone, true)} – {meetingTime(meeting.endAt, meeting.timezone, false)}
        {' '}{meeting.timezone}</small></div>
        <small>{ownerLabel(directory, meeting.assigneeId)}{meeting.location ? ` · ${meeting.location}` : ''}</small></li>)}</ul>
      : <p className={s.muted}>No meetings in this view.</p>)}
  </section>
}
