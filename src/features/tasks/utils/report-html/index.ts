import { escapeHtml } from '@/shared/utils'
import { periodoLargo } from '@/features/tasks/utils/periodo'
import reportContent from './report-content'
import type { Datos } from './types'

export default function reportHtml(datos: Datos): string {
  const { mes, intlLocale, t, nombre } = datos
  const mesIso = `${mes}-01`
  const period = periodoLargo(mesIso, intlLocale)
  const title = `${escapeHtml(t('tasks.report.title'))} — ${escapeHtml(nombre)}`
  const html = reportContent(datos, period, title)

  return html
}

// Public entry point that formats report data and delegates HTML composition.
