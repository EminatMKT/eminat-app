import { supabase } from '@/shared/db'
import type { Tema, DatosTema } from '@/features/reuniones/types'
import { TABLES } from './tables'

const RPC_TEMA_PARA_ACTA = 'tema_para_acta'
const COL_EMPRESA = 'empresa'
const COL_TITULO = 'titulo'

/** El catálogo de asuntos. NO pasa por /api/admin: las tres operaciones que existen ya están
 *  autorizadas por RLS (`temas_update` abre con `is_admin()`), así que una ruta con service_role
 *  sería una segunda implementación de la misma regla, que es lo que ya duele en `blockedBy`. */
const list = () =>
  supabase.from(TABLES.temas).select('*').order(COL_EMPRESA).order(COL_TITULO)

const create = (fila: DatosTema) =>
  supabase.from(TABLES.temas).insert(fila).select().single()

const update = (id: string, patch: Partial<Pick<Tema, 'titulo' | 'activo'>>) =>
  supabase.from(TABLES.temas).update(patch).eq('id', id).select().single()

// El alta desde un acta NO es un insert: el UNIQUE es un oráculo que confirma la existencia de
// asuntos que la RLS esconde. La función resuelve buscar-o-crear de un solo viaje, sin carrera.
// Sin consumidor todavía — la llama el buscar-o-crear del tratamiento, que es la fase 3.
const paraActa = (reunionId: string, titulo: string) =>
  supabase.rpc(RPC_TEMA_PARA_ACTA, { p_reunion: reunionId, p_titulo: titulo })

const temasRepo = { list, create, update, paraActa }

export default temasRepo
