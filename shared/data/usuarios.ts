import { supabase } from '@/shared/db/supabase'

// Capa de acceso a datos para la tabla `usuarios` (+ vista `v_equipo_hoy`).
// Cada función envuelve la query exacta del call site y devuelve el mismo
// PostgrestResponse ({ data, error } / count) que devolvía supabase.

// Heartbeat: marca al usuario como online ahora.
export const touchOnline = (id: string) =>
  supabase.from('usuarios').update({ online_at: new Date().toISOString() }).eq('id', id).then(() => {})

// Cuenta usuarios con online_at desde un ISO dado (head + count exact).
export const countOnlineSince = (iso: string) =>
  supabase.from('usuarios').select('*', { count: 'exact', head: true }).gte('online_at', iso)

// Lista usuarios activos ordenados por nombre.
export const listActivos = () =>
  supabase.from('usuarios').select('*').eq('activo', true).order('nombre', { ascending: true })

// Lista todos los usuarios ordenados por created_at desc.
export const listAll = () =>
  supabase.from('usuarios').select('*').order('created_at', { ascending: false })

// Vista del equipo de hoy.
export const equipoHoy = () =>
  supabase.from('v_equipo_hoy').select('*')

// Actualiza el rol de un usuario.
export const updateRol = (id: string, rol: string) =>
  supabase.from('usuarios').update({ rol }).eq('id', id)

// Valida + activa a un usuario.
export const validar = (id: string) =>
  supabase.from('usuarios').update({ validado: true, activo: true }).eq('id', id)

// Login: busca id + marca_hora por email.
export const findByEmail = (email: string | undefined) =>
  supabase.from('usuarios').select('id, marca_hora').eq('email', email).single()

// Login: actualiza ubicación + online_at tras autenticar.
export const updateUbicacion = (id: string, ubicacion: string) =>
  supabase.from('usuarios').update({ ubicacion, online_at: new Date().toISOString() }).eq('id', id).then(() => {})
