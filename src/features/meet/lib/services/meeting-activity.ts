import { supabase } from '@/shared/db/supabase'
import { createTask, updateTask } from '@/features/meet/lib/services/task-api'
import type { CanonicalTaskRecord, Meeting, Topic } from '@/features/meet/lib/types'

export const MEETING_ACTIVITY_SECTION = 'meeting_activity'

type MeetingActivityInput = {
  meeting: Pick<Meeting, 'id' | 'title' | 'objective' | 'meeting_date' | 'start_time' | 'end_time' | 'location'>
  creatorProfileId: string
  creatorAuthId: string
  companyCode: string
  existingTopic?: Topic | null
}

export function meetingActivityDescription(meeting: MeetingActivityInput['meeting']) {
  const schedule = [meeting.meeting_date, meeting.start_time?.slice(0, 5), meeting.end_time?.slice(0, 5)]
    .filter(Boolean)
    .join(' · ')
  return [meeting.objective, schedule, meeting.location].filter(Boolean).join('\n') || null
}

export async function ensureMeetingActivity({
  meeting,
  creatorProfileId,
  creatorAuthId,
  companyCode,
  existingTopic = null,
}: MeetingActivityInput): Promise<{ topic: Topic; activity: CanonicalTaskRecord }> {
  let topic = existingTopic
  if (!topic) {
    const { data: found, error: findError } = await supabase
      .from('topics')
      .select('id, meeting_id, user_id, title, description, order_index, section, responsable_id, actividad_id, created_at')
      .eq('meeting_id', meeting.id)
      .eq('section', MEETING_ACTIVITY_SECTION)
      .limit(1)
      .maybeSingle()
    if (findError) throw findError
    topic = found as Topic | null
  }
  if (!topic) {
    const { data: created, error: createError } = await supabase
      .from('topics')
      .insert({
        meeting_id: meeting.id,
        user_id: creatorAuthId,
        title: meeting.title,
        description: meetingActivityDescription(meeting),
        section: MEETING_ACTIVITY_SECTION,
        order_index: -1,
        responsable_id: creatorProfileId,
      })
      .select('id, meeting_id, user_id, title, description, order_index, section, responsable_id, actividad_id, created_at')
      .single()
    if (createError || !created) throw createError ?? new Error('No se pudo crear el Topic técnico de la reunión.')
    topic = created as Topic
  }
  const activity = await createTask({
    topic_id: topic.id,
    titulo: meeting.title,
    descripcion: meetingActivityDescription(meeting),
    responsable_id: creatorProfileId,
    fecha_inicio: meeting.meeting_date,
    fecha_entrega: null,
    empresa: companyCode,
  })
  return { topic: { ...topic, actividad_id: activity.id }, activity }
}

export async function syncMeetingActivity(
  meeting: MeetingActivityInput['meeting'],
  activity: CanonicalTaskRecord,
  companyCode: string,
) {
  return updateTask(activity.id, {
    expected_updated_at: activity.updated_at,
    titulo: meeting.title,
    descripcion: meetingActivityDescription(meeting),
    responsable_id: activity.responsable_id,
    empresa: companyCode,
  })
}
