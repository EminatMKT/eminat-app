'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getMeetingById } from '@/features/meet/lib/services/meetings'
import { listMeetingEvents, type MeetingEvent } from '@/features/meet/lib/services/meeting-history'
import { usePreferences } from '@/features/meet/lib/preferences'

const eventLabels = {
  es: {
    meeting_created: 'Reunión creada', meeting_updated: 'Reunión modificada', meeting_reopened: 'Reunión reabierta', meeting_finalized: 'Reunión finalizada',
    report_generated: 'Acta generada', report_sent: 'Acta enviada', task_created: 'Task creada', task_updated: 'Task modificada',
  },
  en: {
    meeting_created: 'Meeting created', meeting_updated: 'Meeting updated', meeting_reopened: 'Meeting reopened', meeting_finalized: 'Meeting finalized',
    report_generated: 'Minutes generated', report_sent: 'Minutes sent', task_created: 'Task created', task_updated: 'Task updated',
  },
}

export default function MeetingHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const { locale, t, formatDate } = usePreferences()
  const [title, setTitle] = useState('')
  const [events, setEvents] = useState<MeetingEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    Promise.all([getMeetingById(id), listMeetingEvents(id)]).then(([meeting, history]) => {
      if (!mounted) return
      if (meeting.ok) setTitle(meeting.data.title)
      setEvents(history)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [id])

  return <div className="mx-auto max-w-3xl space-y-6">
    <header>
      <Link href={`/meetings/${id}`} className="text-sm font-medium text-brand">← {t('viewMeeting')}</Link>
      <h1 className="heading mt-3 text-2xl font-bold">{t('meetingHistory')}</h1>
      {title && <p className="muted mt-1">{title}</p>}
    </header>
    {loading ? <p className="muted">{t('loading')}</p> : events.length === 0 ? (
      <div className="surface rounded-2xl border border-dashed p-10 text-center"><p className="muted">{t('noEvents')}</p></div>
    ) : <ol className="relative ml-3 border-l border-emerald-200 dark:border-emerald-900">
      {events.map((event) => <li key={event.id} className="mb-7 ml-6">
        <span className="absolute -left-2 mt-1 h-4 w-4 rounded-full border-4 border-white bg-brand dark:border-slate-950" />
        <article className="surface rounded-xl border p-4">
          <p className="heading font-semibold">{eventLabels[locale][event.event_type]}</p>
          <p className="muted mt-1 text-sm">{event.summary}</p>
          {typeof event.metadata.actor_name === 'string' && <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">{event.metadata.actor_name}</p>}
          <time className="mt-2 block text-xs text-gray-400">{formatDate(event.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</time>
        </article>
      </li>)}
    </ol>}
  </div>
}
