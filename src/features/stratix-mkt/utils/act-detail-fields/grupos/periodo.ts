import { MESES, mesATrimestre } from '@/shared/context/AppContext'
import { campo, type Deps, type GrupoCampos } from '../tipos'
import type { Actividad } from '@/features/stratix-mkt/types'

// A qué período se imputa. El trimestre se deriva del mes cuando la fila no lo trae.
export function grupoPeriodo(a: Actividad, { t }: Deps): GrupoCampos {
  return {
    titulo: t('stratix.detail.grupoPeriodo'),
    campos: [
      campo(t('stratix.col.month'), a.mes ?? '—', !a.mes),
      campo(t('stratix.detail.quarter'), a.trimestre || mesATrimestre[a.mes || MESES[0]] || 'Q1'),
      campo(t('stratix.detail.week'), a.semana || '—', !a.semana),
    ],
  }
}
