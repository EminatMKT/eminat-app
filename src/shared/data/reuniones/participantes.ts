import { supabase } from '@/shared/db'
import type { Participante, ParticipanteNuevo } from '@/features/reuniones/types'
import { TABLES } from '../tables'

// El orden de la lista NO es el de inserción: `rol_en_reunion` primero, para que quien preside y
// quien levanta el acta encabecen. Postgres ordena el texto alfabéticamente, así que sale
// invitado · participante · preside · secretario — que no es la jerarquía. Se ordena en el
// cliente con `ROL_EN_REUNION.valores`, que ya declara el orden bueno.
export const listByReunion = (reunionId: string) =>
  supabase.from(TABLES.reunionParticipantes).select('*').eq('reunion_id', reunionId)

// La base exige interno XOR externo (`interno_xor_externo`): o va `usuario_id`, o va
// `invitado_nombre`. Quien llama arma la fila; acá no se adivina cuál de los dos.
export const insert = (row: ParticipanteNuevo) =>
  supabase.from(TABLES.reunionParticipantes).insert(row).select().single()

export const update = (id: string, patch: Partial<Participante>) =>
  supabase.from(TABLES.reunionParticipantes).update(patch).eq('id', id).select().single()

export const remove = (id: string) =>
  supabase.from(TABLES.reunionParticipantes).delete().eq('id', id)
