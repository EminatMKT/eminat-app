import { ESTADO_COLORS } from '@/shared/constants/domain'
import { escapeHtml } from '@/shared/utils'
import {
  DEFAULT_ESTADO_COLOR,
  EMPTY_VALUE,
  ROW_CELL_STYLE,
} from '@/features/tasks/utils/report-html/table-rows/constants'
import cell from '../html-cell'

export default function statusCell(estado: string | undefined): string {
  const color = ESTADO_COLORS[estado ?? EMPTY_VALUE] || DEFAULT_ESTADO_COLOR
  const label = escapeHtml(estado || EMPTY_VALUE)
  const pillStyle = `font-size:11px;padding:2px 10px;border-radius:20px;background:${color}20;color:${color};font-weight:600`
  const pill = `<span style="${pillStyle}">${label}</span>`
  const statusCellStyle = `${ROW_CELL_STYLE};text-align:center`
  const html = cell(statusCellStyle, pill)

  return html
}

// Renders the activity's status pill cell, colored per estado with a safe fallback.
