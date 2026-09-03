import { campo, type Deps, type GrupoCampos } from '../tipos'
import type { Actividad } from '@/features/tasks/types'

// Lo que cuesta. Son las dos cifras que terminan en el reporte de pago.
export function grupoEsfuerzo(a: Actividad, { t }: Deps): GrupoCampos {
  return {
    titulo: t('stratix.detail.grupoEsfuerzo'),
    campos: [
      campo(t('stratix.detail.estHours'), `${a.horas || 0}h`, !a.horas),
      campo(t('stratix.detail.prodDays'), String(a.dias_produccion || '0'), !a.dias_produccion),
    ],
  }
}
