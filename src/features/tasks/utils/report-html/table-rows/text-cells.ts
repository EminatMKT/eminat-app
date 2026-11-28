import { escapeHtml } from '@/shared/utils'
import responsibleNames from '@/features/tasks/utils/responsables/label'
import type { Actividad } from '@/features/tasks/types'
import { EMPTY_VALUE, ROW_CELL_STYLE } from './constants'

function cell(style: string, content: string): string {
  const html = `<td style="${style}">${content}</td>`
  return html
}

function titleContent(titulo: string | undefined, descripcion: string | undefined): string {
  const title = escapeHtml(titulo || EMPTY_VALUE)
  const text = escapeHtml(descripcion || EMPTY_VALUE)
  const style = 'white-space:pre-wrap;font-weight:400;margin-top:4px'
  const detail = descripcion ? `<div style="${style}">${text}</div>` : EMPTY_VALUE
  const content = `${title}${detail}`
  return content
}

export function titleCell({ titulo, descripcion }: Actividad): string {
  const style = `${ROW_CELL_STYLE};color:#111;font-weight:500`
  const html = cell(style, titleContent(titulo, descripcion))
  return html
}

export function companyCell({ empresa }: Actividad): string {
  const style = `${ROW_CELL_STYLE};color:#555`
  const html = cell(style, escapeHtml(empresa || EMPTY_VALUE))
  return html
}

export function responsibleCell(act: Actividad, nombrePorId: Record<string, string>): string {
  const style = `${ROW_CELL_STYLE};color:#555`
  const html = cell(style, escapeHtml(responsibleNames(act, nombrePorId)))
  return html
}

// Builds escaped task text cells and delegates assignee labels to the shared helper.
