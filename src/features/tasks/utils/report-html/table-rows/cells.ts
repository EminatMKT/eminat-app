import { ESTADO_COLORS } from '@/shared/constants/domain'
import { escapeHtml } from '@/shared/utils'
import type { Actividad } from '@/features/tasks/types'
import {
  DATE_FALLBACK,
  DEFAULT_ESTADO_COLOR,
  EMPTY_VALUE,
  ROW_CELL_STYLE,
} from './constants'

function cell(style: string, content: string): string {
  const html = `<td style="${style}">${content}</td>`
  return html
}

export function statusCell(estado: string | undefined): string {
  const color = ESTADO_COLORS[estado ?? EMPTY_VALUE] || DEFAULT_ESTADO_COLOR
  const label = escapeHtml(estado || EMPTY_VALUE)
  const style = 'font-size:11px;padding:2px 10px;border-radius:20px;'
  const pillStyle = `${style}background:${color}20;color:${color};font-weight:600`
  const pill = `<span style="${pillStyle}">${label}</span>`
  const html = cell(`${ROW_CELL_STYLE};text-align:center`, pill)
  return html
}

export function dateCells({ fecha_inicio, fecha_entrega }: Actividad): string {
  const start = cell(ROW_CELL_STYLE, escapeHtml(fecha_inicio || DATE_FALLBACK))
  const end = cell(ROW_CELL_STYLE, escapeHtml(fecha_entrega || DATE_FALLBACK))
  const html = `${start}${end}`
  return html
}

// Builds activity date and status cells with escaping and safe fallbacks.
