import { escapeHtml } from '@/shared/utils'
import responsibleNames from '@/features/tasks/utils/responsables/label'
import type { Actividad } from '@/features/tasks/types'
import { ROW_CELL_STYLE } from '@/features/tasks/utils/report-html/table-rows/constants'
import cell from '../html-cell'

export default function responsibleCell(
  act: Actividad,
  nombrePorId: Record<string, string>,
): string {
  const style = `${ROW_CELL_STYLE};color:#555`
  const html = cell(style, escapeHtml(responsibleNames(act, nombrePorId)))

  return html
}

// Renders the activity's resolved assignee label cell.
