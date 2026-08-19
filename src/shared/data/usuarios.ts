import { supabase } from '@/shared/db/supabase'
import { subscribeToTable } from './realtime'
import { TABLES, COLUMNS } from './tables'

// Capa de acceso a datos para la tabla `usuarios` (+ vista `v_equipo_hoy`).
// Cada función envuelve la query exacta del call site y devuelve el mismo
// PostgrestResponse ({ data, error } / count) que devolvía supabase.

// Heartbeat: marca al usuario como online ahora.
export const touchOnline = (id: string) =>
  supabase.from(TABLES.usuarios).update({ online_at: new Date().toISOString() }).eq('id', id).then(() => {})

// Cuenta usuarios con online_at desde un ISO dado (head + count exact).
export const countOnlineSince = (iso: string) =>
  supabase.from(TABLES.usuarios).select('*', { count: 'exact', head: true }).gte(COLUMNS.onlineAt, iso)

// Lista usuarios activos ordenados por nombre, con estructura organizacional embebida.
export const listActivos = () =>
  supabase.from(TABLES.usuarios)
    .select('*, equipos!usuarios_equipo_id_fkey(codigo, nombre, lider_id, departamentos(codigo, nombre)), usuario_cargos(cargos(codigo, nombre))')
    .eq('activo', true).order('nombre', { ascending: true })

// Lista todos los usuarios ordenados por created_at desc, con sus cargos N:N
// embebidos (los usa la tabla del panel admin y el multiselect de edición).
export const listAll = () =>
  supabase.from(TABLES.usuarios)
    .select('*, usuario_cargos(cargo_id, cargos(codigo, nombre))')
    .order(COLUMNS.createdAt, { ascending: false })

// Vista del equipo de hoy.
export const equipoHoy = () =>
  supabase.from(TABLES.equipoHoy).select('*')

// Valida + activa a un usuario.
export const validar = (id: string) =>
  supabase.from(TABLES.usuarios).update({ validado: true, activo: true }).eq('id', id)

// Login: busca id + marca_hora por email.
export const findByEmail = (email: string | undefined) =>
  supabase.from(TABLES.usuarios).select('id, marca_hora').eq('email', email).single()

// Login: actualiza ubicación + online_at tras autenticar.
export const updateUbicacion = (id: string, ubicacion: string) =>
  supabase.from(TABLES.usuarios).update({ ubicacion, online_at: new Date().toISOString() }).eq('id', id).then(() => {})

// Realtime: escucha UPDATE de la propia fila del usuario para propagar en vivo lo
// que el admin cambie (rol, activo) sin esperar un refresh. Mismo patrón que las
// notificaciones; filtrado por id para recibir solo la fila propia.
export const subscribeToUserRow = <T extends { id: string }>(id: string, onUpdate: (row: T) => void) =>
  subscribeToTable<T>({ channel: `user-row-${id}`, table: TABLES.usuarios, filter: `id=eq.${id}` }, { onUpdate })
