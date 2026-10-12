import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/shared/db/supabase'

export type MeetingEventType =
  | 'meeting_created'
  | 'meeting_updated'
  | 'meeting_reopened'
  | 'meeting_finalized'
  | 'report_generated'
  | 'report_sent'
  | 'task_created'
  | 'task_updated'

export type MeetingEvent = {
  id: string
  meeting_id: string
  actor_id: string
  event_type: MeetingEventType
  summary: string
  metadata: Record<string, unknown>
  created_at: string
}

export type MeetingReportVersion = {
  id: string
  meeting_id: string
  version: number
  generated_by: string
  generated_at: string
  sent_at: string | null
  snapshot: Record<string, unknown>
}

/**
 * El historial es append-only y forma parte del contrato funcional de la reunión.
 */
export async function recordMeetingEvent(
  meetingId: string,
  eventType: MeetingEventType,
  summary: string,
  metadata: Record<string, unknown> = {},
  client: SupabaseClient = supabase
): Promise<boolean> {
  const { data: auth } = await client.auth.getUser()
  if (!auth.user) return false
  const { data: profile } = await client
    .from('usuarios')
    .select('nombre_display, nombre, apellido')
    .eq('auth_id', auth.user.id)
    .maybeSingle()
  const actorName = profile
    ? profile.nombre_display || `${profile.nombre ?? ''} ${profile.apellido ?? ''}`.trim()
    : auth.user.email?.split('@')[0] ?? null
  const { error } = await client.from('meeting_events').insert({
    meeting_id: meetingId,
    actor_id: auth.user.id,
    event_type: eventType,
    summary,
    metadata: { ...metadata, actor_name: actorName },
  })
  // SQL captures the durable event. This is only an immediate flush hint; cron drains retries.
  if (!error && (eventType === 'meeting_created' || eventType === 'meeting_updated')) {
    try {
      const { data: session } = await client.auth.getSession()
      if (session.session?.access_token) {
        await fetch('/api/meetings/notifications/process', {
          method: 'POST', signal: AbortSignal.timeout(5000),
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.session.access_token}` },
          body: JSON.stringify({ meetingId }),
        })
      }
    } catch { /* Advisory flush only: the committed outbox remains for the worker. */ }
  }
  return !error
}

export async function listMeetingEvents(
  meetingId: string,
  client: SupabaseClient = supabase
): Promise<MeetingEvent[]> {
  const { data, error } = await client
    .from('meeting_events')
    .select('id, meeting_id, actor_id, event_type, summary, metadata, created_at')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as MeetingEvent[]
}

export async function listLatestMeetingEvents(
  meetingIds: string[],
  client: SupabaseClient = supabase
): Promise<Record<string, MeetingEvent>> {
  if (!meetingIds.length) return {}
  const { data, error } = await client
    .from('meeting_events')
    .select('id, meeting_id, actor_id, event_type, summary, metadata, created_at')
    .in('meeting_id', meetingIds)
    .order('created_at', { ascending: false })
  if (error) return {}
  const latest: Record<string, MeetingEvent> = {}
  for (const event of (data ?? []) as MeetingEvent[]) latest[event.meeting_id] ??= event
  return latest
}
