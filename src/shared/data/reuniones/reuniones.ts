import { supabase } from '@/shared/db'
import type { Reunion, ReunionForm } from '@/features/reuniones/types'
import { TABLES } from '../tables'

// Qué NO se manda en un insert: `codigo` lo pone el trigger `set_codigo_reunion` (numera por
// empresa y por día, con advisory lock) y `estado` tiene su DEFAULT. Mandarlos desde el cliente
// sería darle al navegador la última palabra sobre dos cosas que la base ya decide bien.

export const list = () =>
  supabase.from(TABLES.reuniones).select('*').order('fecha', { ascending: false })

export const byId = (id: string) =>
  supabase.from(TABLES.reuniones).select('*').eq('id', id).single()

// `tipo` viaja como null y no como '': la columna es del DOMAIN `tipo_reunion` y '' no es uno de
// sus valores, así que el insert lo rechazaría el CHECK.
export const insert = (form: ReunionForm, createdBy: string | null) =>
  supabase.from(TABLES.reuniones)
    .insert({ ...form, tipo: form.tipo || null, created_by: createdBy })
    .select().single()

export const update = (id: string, patch: Partial<Reunion>) =>
  supabase.from(TABLES.reuniones).update(patch).eq('id', id).select().single()
