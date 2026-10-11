import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/shared/db/supabase'
import type { ParticipantRecord, Profile } from '@/features/meet/lib/types'
import {
  classifyServiceError,
  type ServiceResult,
} from '@/features/meet/lib/services/errors'

type ParticipantRow = {
  meeting_id: string
  profile_id: string
  usuarios: Profile | null
}

export async function listParticipantsByMeeting(
  meetingId: string,
  client: SupabaseClient = supabase
): Promise<ServiceResult<ParticipantRecord[]>> {
  try {
    const { data, error } = await client
      .from('meeting_participants')
      .select(
        'meeting_id, profile_id, usuarios(id, nombre_display, nombre, apellido, rol)'
      )
      .eq('meeting_id', meetingId)

    if (error) return { ok: false, error: classifyServiceError(error) }
    const rows = (data ?? []) as unknown as ParticipantRow[]
    return {
      ok: true,
      data: rows.map((row) => ({
        meeting_id: row.meeting_id,
        profile_id: row.profile_id,
        profile: row.usuarios,
      })),
    }
  } catch (error) {
    return { ok: false, error: classifyServiceError(error) }
  }
}

export async function listProfiles(
  client: SupabaseClient = supabase
): Promise<ServiceResult<Profile[]>> {
  try {
    const { data, error } = await client
      .from('usuarios')
      .select('id, nombre_display, nombre, apellido, rol')
      .order('nombre')
    if (error) return { ok: false, error: classifyServiceError(error) }
    return { ok: true, data: (data ?? []) as Profile[] }
  } catch (error) {
    return { ok: false, error: classifyServiceError(error) }
  }
}

export async function findBusinessUserId(
  authId: string,
  client: SupabaseClient = supabase
): Promise<ServiceResult<string | null>> {
  try {
    const { data, error } = await client
      .from('usuarios')
      .select('id')
      .eq('auth_id', authId)
      .maybeSingle()
    if (error) return { ok: false, error: classifyServiceError(error) }
    return { ok: true, data: (data as { id: string } | null)?.id ?? null }
  } catch (error) {
    return { ok: false, error: classifyServiceError(error) }
  }
}
