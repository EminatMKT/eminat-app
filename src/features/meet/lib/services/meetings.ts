import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/shared/db/supabase'
import type { MeetingRecord, MeetingUpdateInput } from '@/features/meet/lib/types'
import {
  classifyServiceError,
  type ServiceResult,
} from '@/features/meet/lib/services/errors'

export type MeetingWithCompany = MeetingRecord & {
  empresas?: { nombre: string; codigo: string } | null
}

export async function updateMeetingEditorial(
  id: string,
  input: MeetingUpdateInput,
  expectedUpdatedAt: string,
  client: SupabaseClient = supabase
): Promise<ServiceResult<MeetingRecord>> {
  try {
    const { data, error } = await client
      .from('meetings')
      .update(input)
      .eq('id', id)
      .eq('updated_at', expectedUpdatedAt)
      .select(
        'id, user_id, company_id, title, meeting_type, objective, modality, location, meeting_date, start_time, end_time, participants, status, created_at, updated_at'
      )
      .maybeSingle()

    if (error) return { ok: false, error: classifyServiceError(error) }
    if (!data) {
      return {
        ok: false,
        error: {
          kind: 'conflict',
          message: 'La reunión cambió en otra sesión. Recarga antes de guardar.',
        },
      }
    }
    return { ok: true, data: data as MeetingRecord }
  } catch (error) {
    return { ok: false, error: classifyServiceError(error) }
  }
}

export async function updateMeetingAttendance(
  id: string,
  participants: string[],
  expectedUpdatedAt: string,
  client: SupabaseClient = supabase
): Promise<ServiceResult<MeetingRecord>> {
  try {
    const { data, error } = await client.from('meetings').update({ participants })
      .eq('id', id).eq('updated_at', expectedUpdatedAt)
      .select('id, user_id, company_id, title, meeting_type, objective, modality, location, meeting_date, start_time, end_time, participants, status, created_at, updated_at')
      .maybeSingle()
    if (error) return { ok: false, error: classifyServiceError(error) }
    if (!data) return { ok: false, error: { kind: 'conflict', message: 'La asistencia cambió en otra sesión. Recarga antes de guardar.' } }
    return { ok: true, data: data as MeetingRecord }
  } catch (error) {
    return { ok: false, error: classifyServiceError(error) }
  }
}

export async function getMeetingById(
  id: string,
  client: SupabaseClient = supabase
): Promise<ServiceResult<MeetingWithCompany>> {
  try {
    const { data, error } = await client
      .from('meetings')
      .select(
        'id, user_id, company_id, title, meeting_type, objective, modality, location, meeting_date, start_time, end_time, participants, status, created_at, updated_at, empresas!meetings_company_id_fkey(nombre, codigo)'
      )
      .eq('id', id)
      .maybeSingle()

    if (error) return { ok: false, error: classifyServiceError(error) }
    if (!data) {
      return {
        ok: false,
        error: {
          kind: 'indeterminate',
          message:
            'La reunión no está disponible. Puede no existir o estar oculta por permisos (NOT VERIFIED).',
        },
      }
    }
    return { ok: true, data: data as unknown as MeetingWithCompany }
  } catch (error) {
    return { ok: false, error: classifyServiceError(error) }
  }
}
