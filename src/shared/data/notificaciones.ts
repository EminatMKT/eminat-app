import { supabase } from '@/shared/db/supabase'
import { subscribeToTable } from './realtime'
import { TABLES, COLUMNS } from './tables'

// Capa de acceso a datos para la tabla `notificaciones`.

// Lista las 50 notificaciones más recientes de un usuario.
export const listForUser = (usuarioId: string) =>
  supabase.from(TABLES.notificaciones).select('*').eq('usuario_id', usuarioId).order(COLUMNS.createdAt, { ascending: false }).limit(50)

// Inserta una notificación.
export const insert = (record: Record<string, unknown>) =>
  supabase.from(TABLES.notificaciones).insert(record)

// Marca como leídas un conjunto de notificaciones por id.
export const markReadByIds = (ids: string[]) =>
  supabase.from(TABLES.notificaciones).update({ leida: true }).in('id', ids)

// Marca como leídas todas las no leídas.
export const markAllRead = () =>
  supabase.from(TABLES.notificaciones).update({ leida: true }).eq('leida', false)

// Suscripción realtime a inserts de notificaciones del usuario.
// Devuelve el canal para que el caller pueda hacer supabase.removeChannel(canal).
export const subscribeToUserNotifs = <T extends Record<string, unknown>>(userId: string, onInsert: (row: T) => void) =>
  subscribeToTable<T>({ channel: `notif-${userId}`, table: TABLES.notificaciones, filter: `usuario_id=eq.${userId}` }, { onInsert })
