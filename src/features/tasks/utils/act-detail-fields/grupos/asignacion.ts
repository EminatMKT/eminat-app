import { campo, type Deps, type GrupoCampos } from '../tipos'
import type { Actividad } from '@/features/tasks/types'

// Quién ejecuta, quién pidió y quién cargó. Es lo primero que se busca al abrir una ficha.
// Las tres son personas distintas y con cinco áreas en el mismo tablero dejan de coincidir.
export function grupoAsignacion(a: Actividad, { t, miembrosPorId }: Deps): GrupoCampos {
  const persona = (id: string | undefined) => miembrosPorId[id ?? ''] ?? '—'
  return {
    titulo: t('stratix.detail.grupoAsignacion'),
    campos: [
      campo(t('stratix.col.assignee'), persona(a.responsable_id), !a.responsable_id),
      campo(t('stratix.detail.requestedBy'), persona(a.solicitante_id), !a.solicitante_id),
      campo(t('stratix.detail.createdBy'), persona(a.created_by_id), !a.created_by_id),
    ],
  }
}
