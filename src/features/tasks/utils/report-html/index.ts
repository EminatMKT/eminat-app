import { escapeHtml } from '@/shared/utils'
import { periodoLargo } from '@/features/tasks/utils/periodo'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'
import reportContent from './report-content'

export type Datos = {
  acts: Actividad[]
  nombre: string
  mes: string
  intlLocale: string
  nombrePorId: Record<string, string>
  t: (key: I18nKey) => string
  hoy: Date
  origin: string
}

export function reportHtml(datos: Datos): string {
  const { mes, intlLocale, t, nombre } = datos
  const period = periodoLargo(`${mes}-01`, intlLocale)
  const title = `${escapeHtml(t('tasks.report.title'))} — ${escapeHtml(nombre)}`
  const html = reportContent(datos, period, title)
  return html
}

// Public entry point that formats report data and delegates HTML composition.
