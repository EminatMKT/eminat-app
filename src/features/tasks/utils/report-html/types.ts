import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'

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
