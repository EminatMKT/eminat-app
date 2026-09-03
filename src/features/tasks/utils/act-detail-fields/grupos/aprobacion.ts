import { verificadoLabel } from '@/shared/constants/domain'
import { campo, type Deps, type GrupoCampos } from '../tipos'
import { fechaLarga } from '../fecha'
import type { Actividad } from '@/features/tasks/types'

// El flujo de revisión. `verificado` NO es booleano: es texto con cuatro valores (ver
// VERIFICADO en domain.ts) — leerlo como sí/no hacía que toda tarea figurara verificada.
export function grupoAprobacion(a: Actividad, deps: Deps): GrupoCampos {
  const { t, locale, miembrosPorId } = deps
  return {
    titulo: t('stratix.detail.grupoAprobacion'),
    campos: [
      campo(t('stratix.detail.verified'), verificadoLabel(a.verificado, t)),
      campo(t('stratix.detail.approvedBy'), miembrosPorId[a.aprobado_por_id ?? ''] ?? '—', !a.aprobado_por_id),
      campo(t('stratix.detail.approvalDate'), fechaLarga(a.fecha_aprobacion, locale, t), !a.fecha_aprobacion),
      campo(t('stratix.detail.blocked'), a.bloqueada ? t('common.yes') : t('common.no'), !a.bloqueada),
    ],
  }
}
