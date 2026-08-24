import { supabaseAdmin } from './supabaseAdmin'

type Db = ReturnType<typeof supabaseAdmin>

// Reemplaza la selección de cargos de un usuario (tabla puente N:N usuario_cargos).
// Delete + insert en vez de diff: la selección es chica y así no hay estado parcial
// si el admin desmarca todo. Devuelve el error del insert, o null si salió bien.
export async function syncUsuarioCargos(db: Db, usuarioId: string, cargoIds: string[]) {
  await db.from('usuario_cargos').delete().eq('usuario_id', usuarioId)
  if (!cargoIds.length) return null
  const { error } = await db.from('usuario_cargos')
    .insert(cargoIds.map(cargo_id => ({ usuario_id: usuarioId, cargo_id })))
  return error
}

// Nombres de los cargos elegidos (para el email de bienvenida / paneles de UI server-side).
export async function cargoNames(db: Db, cargoIds: string[]): Promise<string> {
  if (!cargoIds.length) return ''
  const { data } = await db.from('cargos').select('nombre').in('id', cargoIds)
  return (data || []).map(c => c.nombre).join(', ')
}
