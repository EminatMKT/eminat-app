import { supabase } from '@/shared/db'
import { TABLES } from '../tables'
import { update } from './vistas'

// Cuál vista abre por defecto. Vive aparte del CRUD porque es lo ÚNICO de esta carpeta que puede
// estar mal: el resto son llamadas de una línea, y esto es una secuencia con un orden obligatorio.
//
// Van DOS sentencias y no una: el índice único parcial `vista_default_unica` se valida fila por
// fila en el momento, no al final de la transacción, así que encender la nueva antes de apagar la
// vieja choca. La colisión está probada — es la que reventó al verificar la migración.
export const marcarPorDefecto = async (usuarioId: string, ambito: string, id: string) => {
  await supabase.from(TABLES.vistasFiltro).update({ abre_por_defecto: false })
    .eq('usuario_id', usuarioId).eq('ambito', ambito).eq('abre_por_defecto', true)
  return update(id, { abre_por_defecto: true })
}
