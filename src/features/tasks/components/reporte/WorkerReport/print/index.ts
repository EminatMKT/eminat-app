import { now } from '@/shared/utils'
import reportHtml from '@/features/tasks/utils/report-html'
import type { Actividad } from '@/features/tasks/types'
import type { Row, PrintAuthor, PrintContext } from '../types'
import { PRINT_BLANK_URL, PRINT_TARGET, PRINT_FEATURES } from './constants'

function toActividad(row: Row, authorId: string): Actividad {
  return { ...row, responsables: [{ usuario_id: authorId, es_lider: true }] }
}

/**
 * Prints just the signed-in worker's own rows — same self-scoped boundary as the fetch.
 */
export default function printWorkerReport(
  rows: Row[],
  author: PrintAuthor,
  ctx: PrintContext,
) {
  const w = window.open(PRINT_BLANK_URL, PRINT_TARGET, PRINT_FEATURES)

  if (!w) return

  const acts = rows.map(row => toActividad(row, author.id))
  const payload = {
    acts,
    nombre: author.nombre,
    mes: ctx.mes,
    intlLocale: ctx.intlLocale,
    nombrePorId: { [author.id]: author.nombre },
    t: ctx.t,
    hoy: now(),
    origin: window.location.origin,
  }

  w.document.write(reportHtml(payload))
  w.document.close()
}

// Imprime únicamente las filas propias de quien inició sesión; nunca datos de otros miembros.
