import { escapeHtml } from '@/shared/utils'
import type { Actividad } from '@/features/tasks/types'
import {
  EMPTY_VALUE,
  ROW_CELL_STYLE,
} from '@/features/tasks/utils/report-html/table-rows/constants'
import cell from '../html-cell'

function titleContent(titulo: string | undefined, descripcion: string | undefined): string {
  const title = escapeHtml(titulo || EMPTY_VALUE)
  const text = escapeHtml(descripcion || EMPTY_VALUE)
  const style = 'white-space:pre-wrap;font-weight:400;margin-top:4px'
  const detail = descripcion ? `<div style="${style}">${text}</div>` : EMPTY_VALUE
  const content = `${title}${detail}`

  return content
}

export default function titleCell({ titulo, descripcion }: Actividad): string {
  const style = `${ROW_CELL_STYLE};color:#111;font-weight:500`
  const html = cell(style, titleContent(titulo, descripcion))

  return html
}

// Renders the task title cell, escaping text and appending its description when present.
