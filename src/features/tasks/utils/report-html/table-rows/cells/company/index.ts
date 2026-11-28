import { escapeHtml } from '@/shared/utils'
import type { Actividad } from '@/features/tasks/types'
import {
  EMPTY_VALUE,
  ROW_CELL_STYLE,
} from '@/features/tasks/utils/report-html/table-rows/constants'
import cell from '../html-cell'

export default function companyCell({ empresa }: Actividad): string {
  const style = `${ROW_CELL_STYLE};color:#555`
  const html = cell(style, escapeHtml(empresa || EMPTY_VALUE))

  return html
}

// Renders the activity's company/brand cell with an empty-value fallback.
