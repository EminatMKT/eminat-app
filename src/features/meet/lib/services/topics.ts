import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/shared/db/supabase'
import type { TopicEditorialUpdate, TopicRecord } from '@/features/meet/lib/types'
import {
  classifyServiceError,
  type ServiceResult,
} from '@/features/meet/lib/services/errors'

export async function listTopicsByMeeting(
  meetingId: string,
  client: SupabaseClient = supabase
): Promise<ServiceResult<TopicRecord[]>> {
  try {
    const { data, error } = await client
      .from('topics')
      .select(
        'id, meeting_id, user_id, title, description, order_index, section, responsable_id, actividad_id, created_at'
      )
      .eq('meeting_id', meetingId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) return { ok: false, error: classifyServiceError(error) }
    return { ok: true, data: (data ?? []) as TopicRecord[] }
  } catch (error) {
    return { ok: false, error: classifyServiceError(error) }
  }
}

export async function updateTopicEditorial(
  id: string,
  input: TopicEditorialUpdate,
  client: SupabaseClient = supabase
): Promise<ServiceResult<TopicRecord>> {
  try {
    // actividad_id is deliberately absent from input and from this mutation.
    const { data, error } = await client
      .from('topics')
      .update(input)
      .eq('id', id)
      .select(
        'id, meeting_id, user_id, title, description, order_index, section, responsable_id, actividad_id, created_at'
      )
      .single()
    if (error) return { ok: false, error: classifyServiceError(error) }
    return { ok: true, data: data as TopicRecord }
  } catch (error) {
    return { ok: false, error: classifyServiceError(error) }
  }
}

export async function persistTopicOrder(
  topics: Pick<TopicRecord, 'id' | 'order_index'>[],
  client: SupabaseClient = supabase
): Promise<ServiceResult<null>> {
  try {
    for (const topic of topics) {
      const { error } = await client
        .from('topics')
        .update({ order_index: topic.order_index })
        .eq('id', topic.id)
      if (error) return { ok: false, error: classifyServiceError(error) }
    }
    return { ok: true, data: null }
  } catch (error) {
    return { ok: false, error: classifyServiceError(error) }
  }
}
