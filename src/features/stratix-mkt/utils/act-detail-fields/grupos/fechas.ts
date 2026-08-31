import { campo, type Deps, type GrupoCampos } from '../tipos'
import { fechaLarga } from '../fecha'
import type { Actividad } from '@/features/stratix-mkt/types'

// Cuándo empieza, cuándo la pidieron y para cuándo es. La de aprobación va con el resto del
// flujo, no acá.
//
// `Inicio` vivía en un grupo PERÍODO propio, junto a un Trimestre calculado. Los dos se fueron el
// 31/08: era una fecha sola en su apartado mientras las otras dos estaban acá abajo, y el
// trimestre repetía —en otro formato— lo que la fecha de al lado ya decía.
//
// El MES de `fecha_inicio` sigue siendo el período que se imputa en el reporte de pago; lo que
// cambió es dónde se lee, no lo que significa.
export function grupoFechas(
  { fecha_inicio, fecha_requerida, fecha_entrega }: Actividad,
  { t, locale }: Deps,
): GrupoCampos {
  const f = (v: string | undefined) => fechaLarga(v, locale, t)
  const grupo = {
    titulo: t('stratix.detail.grupoFechas'),
    campos: [
      campo(t('stratix.detail.start'), f(fecha_inicio), !fecha_inicio),
      campo(t('stratix.detail.requiredDate'), f(fecha_requerida), !fecha_requerida),
      campo(t('stratix.col.due'), f(fecha_entrega), !fecha_entrega),
    ],
  }
  return grupo
}
