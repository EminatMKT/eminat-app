import { escapeHtml } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import { DATE_LOCALE, DATE_OPTIONS, FOOTER_STYLE } from './constants'

function formatDate(hoy: Date): string {
  const formatted = hoy.toLocaleDateString(DATE_LOCALE, DATE_OPTIONS)
  const date = escapeHtml(formatted)
  return date
}

export default function reportFooter(
  hoy: Date,
  t: (key: I18nKey) => string,
): string {
  const date = formatDate(hoy)
  const brand = escapeHtml(t('tasks.report.brand'))
  const html = `<div style="${FOOTER_STYLE}"><span>${date}</span><span>${brand}</span></div>`
  return html
}

// Renders the print date and translated report brand in the document footer.
