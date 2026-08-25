import { fechaLarga } from './fecha'
import type { Deps } from './tipos'
import type { Actividad } from '@/features/stratix-mkt/types'

// Cuándo nació la fila y cuándo se tocó. Va al pie y en voz baja: no es un dato de la tarea,
// es metadato de la base — útil para entender qué pasó, no para trabajar.
export function rastroDeActividad(a: Actividad, { t, locale }: Deps): string {
  const f = (v: string | undefined) => fechaLarga(v, locale, t)
  return `${t('stratix.detail.created')} ${f(a.created_at)} · ${t('stratix.detail.updated')} ${f(a.updated_at)}`
}
