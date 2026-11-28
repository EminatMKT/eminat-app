import { escapeHtml } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import {
  CAPTION_STYLE,
  EMPTY_VALUE,
  MEMBER_STYLE,
  PERIOD_STYLE,
  PRINT_STYLE,
  RIGHT_STYLE,
  ROW_STYLE,
} from './constants'

function memberCell(nombre: string, t: (key: I18nKey) => string): string {
  const label = escapeHtml(t('stratix.report.teamMember'))
  const member = escapeHtml(nombre)
  const html = `<div><div style="${CAPTION_STYLE}">${label}</div>`
    + `<div style="${MEMBER_STYLE}">${member}</div></div>`
  return html
}

function printCell(t: (key: I18nKey) => string): string {
  const label = escapeHtml(t('common.print'))
  const button = `<button onclick="window.print()" style="${PRINT_STYLE}">${label}</button>`
  const html = `<div class="no-print">${button}</div>`
  return html
}

function periodCell(periodoTexto: string, t: (key: I18nKey) => string): string {
  const label = escapeHtml(t('stratix.report.period'))
  const period = escapeHtml(periodoTexto)
  const html = `<div style="${RIGHT_STYLE}"><div style="${CAPTION_STYLE}">${label}</div>`
    + `<div style="${PERIOD_STYLE}">${period}</div></div>`
  return html
}

export default function buildMemberPeriodRow(
  nombre: string,
  periodoTexto: string,
  t: (key: I18nKey) => string,
): string {
  const cells = [memberCell(nombre, t), printCell(t), periodCell(periodoTexto, t)]
  const html = `<div style="${ROW_STYLE}">${cells.join(EMPTY_VALUE)}</div>`
  return html
}

// Renders the member, print control, and preformatted period row.
