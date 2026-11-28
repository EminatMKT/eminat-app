import { escapeHtml } from '@/shared/utils'
import type { Actividad } from '@/features/tasks/types'
import {
  DATE_FALLBACK,
  ROW_CELL_STYLE,
} from '@/features/tasks/utils/report-html/table-rows/constants'
import cell from '../html-cell'

export default function dateCells({ fecha_inicio, fecha_entrega }: Actividad): string {
  const start = cell(ROW_CELL_STYLE, escapeHtml(fecha_inicio || DATE_FALLBACK))
  const end = cell(ROW_CELL_STYLE, escapeHtml(fecha_entrega || DATE_FALLBACK))
  const html = `${start}${end}`

  return html
}

// Renders the activity's start/end date cells with a dash fallback.
