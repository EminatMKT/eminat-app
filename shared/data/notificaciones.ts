import { supabase } from '@/shared/db/supabase'
import { TABLES, COLUMNS } from './tables'

// Capa de acceso a datos para la tabla `notificaciones`.

// Lista las 50 notificaciones más recientes de un usuario.
export const listForUser = (usuarioId: string) =>
  supabase.from(TABLES.notificaciones).select('*').eq('usuario_id', usuarioId).order(COLUMNS.createdAt, { ascending: false }).limit(50)

// Inserta una notificación.
export const insert = (record: any) =>
  supabase.from(TABLES.notificaciones).insert(record)

// Marca como leídas un conjunto de notificaciones por id.
export const markReadByIds = (ids: any[]) =>
  supabase.from(TABLES.notificaciones).update({ leida: true }).in('id', ids)

// Marca como leídas todas las no leídas.
export const markAllRead = () =>
  supabase.from(TABLES.notificaciones).update({ leida: true }).eq('leida', false)

// Suscripción realtime a inserts de notificaciones del usuario.
// Devuelve el canal para que el caller pueda hacer supabase.removeChannel(canal).
export const subscribeToUserNotifs = (userId: string, onInsert: (row: any) => void) =>
  supabase
    .channel(`notif-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: TABLES.notificaciones, filter: `usuario_id=eq.${userId}` },
      (payload: any) => onInsert(payload.new)
    )
    .subscribe()

// Remueve un canal realtime previamente creado.
export const removeChannel = (channel: any) => supabase.removeChannel(channel)
