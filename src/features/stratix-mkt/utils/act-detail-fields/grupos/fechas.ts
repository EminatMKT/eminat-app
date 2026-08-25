import { campo, type Deps, type GrupoCampos } from '../tipos'
import { fechaLarga } from '../fecha'
import type { Actividad } from '@/features/stratix-mkt/types'

// Cuándo la pidieron y para cuándo es. La de aprobación va con el resto del flujo, no acá.
export function grupoFechas(a: Actividad, { t, locale }: Deps): GrupoCampos {
  const f = (v: string | undefined) => fechaLarga(v, locale, t)
  return {
    titulo: t('stratix.detail.grupoFechas'),
    campos: [
      campo(t('stratix.detail.requiredDate'), f(a.fecha_requerida), !a.fecha_requerida),
      campo(t('stratix.col.due'), f(a.fecha_entrega), !a.fecha_entrega),
    ],
  }
}
