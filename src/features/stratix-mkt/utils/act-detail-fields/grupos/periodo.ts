import { fechaCorta } from '@/shared/utils'
import { trimestreDe } from '@/features/stratix-mkt/utils/periodo'
import { campo, type Deps, type GrupoCampos } from '../tipos'
import type { Actividad } from '@/features/stratix-mkt/types'

// Cuándo empieza el trabajo, y el trimestre que sale de ahí. Eran tres campos —Mes, Trimestre y
// Semana— y son dos: la fecha ya trae mes y año, y el trimestre se calcula. `semana` se fue con
// su columna: no la leía ningún filtro ni el reporte.
//
// El fallback `|| 'Q1'` que había acá INVENTABA un trimestre para una fila sin mes, y ese dato
// después se sumaba. Sin fecha, los dos campos se marcan vacíos y la ficha los atenúa.
//
// Ojo con lo migrado del Google Sheet: esas 251 filas llevan el día 1 como marcador, porque el
// Sheet declaraba el mes y no el día.
export function grupoPeriodo({ fecha_inicio }: Actividad, { t, locale }: Deps): GrupoCampos {
  const trimestre = trimestreDe(fecha_inicio)
  const grupo = {
    titulo: t('stratix.detail.grupoPeriodo'),
    campos: [
      campo(t('stratix.detail.start'), fecha_inicio ? fechaCorta(fecha_inicio, locale) : '—', !fecha_inicio),
      campo(t('stratix.detail.quarter'), trimestre || '—', !trimestre),
    ],
  }
  return grupo
}
