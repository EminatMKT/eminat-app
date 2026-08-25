import { MESES, mesATrimestre } from '@/shared/context/AppContext'
import { verificadoLabel } from '@/shared/constants/domain'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/stratix-mkt/types'

type Deps = {
  t: (k: I18nKey) => string
  locale: string
  miembrosPorId: Record<string, string>
}

export type DetalleCampo = { label: string; value: string }

// Una fecha `YYYY-MM-DD` se lee en hora LOCAL (el 'T00:00:00'): sin eso, `new Date('2026-07-30')`
// es medianoche UTC y en UTC-4 se muestra el día anterior (ver rules/codigo.md). Los timestamps
// completos ya traen su zona, así que van tal cual.
export function fechaLarga(v: string | undefined, locale: string, t: Deps['t']): string {
  if (!v) return t('stratix.detail.noDate')
  const d = new Date(v.length === 10 ? v + 'T00:00:00' : v)
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

// Las filas de la ficha de una actividad. Vive acá y no adentro del componente porque es una
// TABLA DE DATOS: quince filas de etiqueta+valor empujaban el JSX fuera de la pantalla, y acá
// cada regla de formateo —el '—' de lo vacío, el trimestre derivado del mes, `verificado` que
// NO es booleano— se testea sin montar nada.
export function camposDeActividad(a: Actividad, { t, locale, miembrosPorId }: Deps): DetalleCampo[] {
  const fecha = (v: string | undefined) => fechaLarga(v, locale, t)
  return [
    { label: t('stratix.col.assignee'), value: miembrosPorId[a.responsable_id ?? ''] ?? '—' },
    { label: t('stratix.detail.requestedBy'), value: miembrosPorId[a.solicitante_id ?? ''] ?? '—' },
    { label: t('stratix.col.month'), value: a.mes ?? '—' },
    { label: t('stratix.detail.quarter'), value: a.trimestre || mesATrimestre[a.mes || MESES[0]] || 'Q1' },
    { label: t('stratix.detail.estHours'), value: `${a.horas || 0}h` },
    { label: t('stratix.detail.prodDays'), value: String(a.dias_produccion || '0') },
    { label: t('stratix.col.due'), value: fecha(a.fecha_entrega) },
    { label: t('stratix.detail.verified'), value: verificadoLabel(a.verificado, t) },
    { label: t('stratix.detail.week'), value: a.semana || '—' },
    { label: t('stratix.detail.requiredDate'), value: fecha(a.fecha_requerida) },
    { label: t('stratix.detail.approvedBy'), value: miembrosPorId[a.aprobado_por_id ?? ''] ?? '—' },
    { label: t('stratix.detail.approvalDate'), value: fecha(a.fecha_aprobacion) },
    { label: t('stratix.detail.blocked'), value: a.bloqueada ? t('common.yes') : t('common.no') },
    { label: t('stratix.detail.created'), value: fecha(a.created_at) },
    { label: t('stratix.detail.updated'), value: fecha(a.updated_at) },
  ]
}
