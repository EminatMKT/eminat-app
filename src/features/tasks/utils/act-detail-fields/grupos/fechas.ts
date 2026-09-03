import { campo, type Deps, type GrupoCampos } from '../tipos'
import { fechaLarga } from '../fecha'
import type { Actividad } from '@/features/tasks/types'

// Cuándo empieza y para cuándo es. La de aprobación va con el resto del flujo, no acá.
//
// `Inicio` vivía en un grupo PERÍODO propio, junto a un Trimestre calculado. Los dos se fueron el
// 31/08: era una fecha sola en su apartado mientras la otra estaba acá abajo, y el trimestre
// repetía —en otro formato— lo que la fecha de al lado ya decía.
//
// El MES de `fecha_inicio` sigue siendo el período que se imputa en el reporte de pago; lo que
// cambió es dónde se lee, no lo que significa.
//
// Acá vivía un tercer renglón, `Pedida para`, que leía `actividades.fecha_requerida`. Se fue el
// 03/09: esa columna llegó con la importación del Google Sheet y ningún formulario de la app la
// escribe, así que de las 370 filas de producción la tienen 246 —todas del Sheet— y CERO de las
// 119 nacidas en la app. El renglón sólo podía decir "Sin fecha", y cada vez en más tarjetas.
// La columna sigue en la tabla con sus 246 valores; sale en la fase 2, con `mes` y `sheet_row`.
export function grupoFechas(
  { fecha_inicio, fecha_entrega }: Actividad,
  { t, locale }: Deps,
): GrupoCampos {
  const f = (v: string | undefined) => fechaLarga(v, locale, t)
  const grupo = {
    titulo: t('stratix.detail.grupoFechas'),
    campos: [
      campo(t('stratix.detail.start'), f(fecha_inicio), !fecha_inicio),
      campo(t('stratix.col.due'), f(fecha_entrega), !fecha_entrega),
    ],
  }
  return grupo
}
