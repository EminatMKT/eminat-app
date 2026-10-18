'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import { ownerLabel, type SalesDirectory } from './salesDirectory'
import s from './SalesModule.module.css'

type Resource = 'leads' | 'contacts' | 'accounts' | 'opportunities'
type Event = { id: string; action: string; occurredAt: string; actorId?: string | null;
  actorName?: string | null; changes?: unknown }
type Timeline = { data?: Event[]; nextCursor?: string | null; code?: string }

function description(changes: unknown): string | null {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return null
  const value = changes as Record<string, unknown>
  for (const key of ['body', 'subject', 'title']) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim().slice(0, 240)
  }
  return null
}

export default function SalesTimeline({ resource, recordId, directory, refreshKey }: {
  resource: Resource; recordId: string; directory: SalesDirectory; refreshKey: number
}) {
  const [events, setEvents] = useState<Event[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setEvents([]); setNextCursor(null); setLoading(true); setError('')
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) throw new Error('SESSION_REQUIRED')
      const response = await fetch(`/api/integrations/annie/sales/extended/${resource}/${recordId}/timeline?limit=25`, {
        cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await response.json() as Timeline
      if (!response.ok || !Array.isArray(result.data)) throw new Error(result.code ?? 'TIMELINE_UNAVAILABLE')
      if (!cancelled) { setEvents(result.data); setNextCursor(result.nextCursor ?? null) }
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'TIMELINE_UNAVAILABLE') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [resource, recordId, refreshKey])

  async function more() {
    if (!nextCursor || loading) return
    setLoading(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('SESSION_REQUIRED')
      const query = new URLSearchParams({ limit: '25', cursor: nextCursor })
      const response = await fetch(`/api/integrations/annie/sales/extended/${resource}/${recordId}/timeline?${query}`, {
        cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await response.json() as Timeline
      if (!response.ok || !Array.isArray(result.data)) throw new Error(result.code ?? 'TIMELINE_UNAVAILABLE')
      setEvents(current => [...current, ...result.data!.filter(row => !current.some(existing => existing.id === row.id))])
      setNextCursor(result.nextCursor ?? null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'TIMELINE_UNAVAILABLE') }
    finally { setLoading(false) }
  }

  return <section className={s.card} aria-label="ANNIE commercial timeline">
    <h2>Commercial timeline</h2>
    {error && <p role="alert" className={s.error}>{error}</p>}
    {loading && !events.length && <p role="status">Loading timeline…</p>}
    {!loading && !events.length && !error && <p className={s.muted}>No events yet.</p>}
    {!!events.length && <ul className={s.list}>{events.map(event => <li key={event.id}>
      <div><strong>{event.action.replaceAll(/[._]/g, ' ')}</strong>
        {description(event.changes) && <p>{description(event.changes)}</p>}
        <small>{Number.isFinite(Date.parse(event.occurredAt)) ? new Date(event.occurredAt).toLocaleString() : 'Time unavailable'}
          {' · '}{event.actorName?.trim() || ownerLabel(directory, event.actorId)}</small>
      </div>
    </li>)}</ul>}
    {nextCursor && <button type="button" className={s.next} disabled={loading} onClick={() => void more()}>Load more</button>}
  </section>
}
