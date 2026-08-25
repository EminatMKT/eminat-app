import { campo, type Deps, type GrupoCampos } from '../tipos'
import type { Actividad } from '@/features/stratix-mkt/types'

// Quién ejecuta y quién pidió. Es lo primero que se busca al abrir una ficha.
export function grupoAsignacion(a: Actividad, { t, miembrosPorId }: Deps): GrupoCampos {
  const persona = (id: string | undefined) => miembrosPorId[id ?? ''] ?? '—'
  return {
    titulo: t('stratix.detail.grupoAsignacion'),
    campos: [
      campo(t('stratix.col.assignee'), persona(a.responsable_id), !a.responsable_id),
      campo(t('stratix.detail.requestedBy'), persona(a.solicitante_id), !a.solicitante_id),
    ],
  }
}
