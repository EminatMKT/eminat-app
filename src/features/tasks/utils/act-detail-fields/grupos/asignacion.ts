import { campo, type Deps, type GrupoCampos } from '../tipos'
import responsables from '@/features/tasks/utils/responsables'
import usersFromNames from '@/features/tasks/utils/responsables/names'
import type { Actividad } from '@/features/tasks/types'

// Quién ejecuta, quién pidió y quién cargó. Es lo primero que se busca al abrir una ficha.
// Las tres son personas distintas y con cinco áreas en el mismo tablero dejan de coincidir.
export function grupoAsignacion(a: Actividad, { t, miembrosPorId }: Deps): GrupoCampos {
  const persona = (id: string | undefined) => miembrosPorId[id ?? ''] ?? '—'
  // The detail lists every responsible, in the same leader-first order as the compact label.
  const ordered = responsables.responsablesOrdenados(a, usersFromNames(miembrosPorId))
  const team = ordered.map(r => persona(r.usuario_id)).join(', ')
  const teamField = { ...campo(t('tasks.responsibles.label'), team || '—', !team), lider: ordered[0]?.es_lider ?? false }
  return {
    titulo: t('stratix.detail.grupoAsignacion'),
    campos: [
      teamField,
      campo(t('stratix.detail.requestedBy'), persona(a.solicitante_id), !a.solicitante_id),
      campo(t('stratix.detail.createdBy'), persona(a.created_by_id), !a.created_by_id),
    ],
  }
}
