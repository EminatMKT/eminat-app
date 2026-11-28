import { escapeHtml } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'
import { EMPTY_STYLE, EMPTY_VALUE } from './constants'

export default function emptyNotice(
  acts: Actividad[],
  t: (key: I18nKey) => string,
): string {
  const notice = acts.length === 0
    ? `<div style="${EMPTY_STYLE}">${escapeHtml(t('stratix.report.empty'))}</div>`
    : EMPTY_VALUE
  const html = notice
  return html
}

// Renders the translated empty-table notice only for a report with no activities.
