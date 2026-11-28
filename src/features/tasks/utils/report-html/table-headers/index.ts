import { escapeHtml } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import { EMPTY_VALUE, HEADER_KEYS } from './constants'

function headerCell(label: string): string {
  const style = 'padding:10px;text-align:left;font-size:10px;color:#888;font-family:monospace;'
  const textStyle = 'text-transform:uppercase;border-bottom:2px solid #e5e7eb;font-weight:400'
  const html = `<th style="${style}${textStyle}">${escapeHtml(label)}</th>`
  return html
}

export default function buildTableHeaders(t: (key: I18nKey) => string): string {
  const headers = HEADER_KEYS.map(key => headerCell(t(key))).join(EMPTY_VALUE)
  const html = headers
  return html
}

// Builds the six translated header cells for the printable task table.
