'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import Badge from './Badge'
import { SEVERIDAD_COLORS } from '../constants'
import type { HipaaIncidente } from '../types'

export default function IncidentCard({ incidente: i }: { incidente: HipaaIncidente }) {
  const { s2, t1, t2, t3, accent, border } = useApp()
  const { t } = useT()
  return (
    <div style={{ padding: '12px', borderRadius: 10, border: `1px solid ${border}`, marginBottom: 8, background: i.estado === 'abierto' ? `${SEVERIDAD_COLORS[i.severidad]}05` : 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Badge color={SEVERIDAD_COLORS[i.severidad]}>{i.severidad}</Badge>
        <Badge color={accent}>{i.tipo}</Badge>
        <Badge color={i.estado === 'abierto' ? '#F87171' : i.estado === 'investigando' ? '#FBB040' : '#34D399'}>{i.estado}</Badge>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: t1, marginBottom: 4 }}>{i.titulo}</div>
      <div style={{ fontSize: 11, color: t2, lineHeight: 1.5 }}>{i.descripcion}</div>
      <div style={{ fontSize: 10, color: t3, marginTop: 6 }}>{i.fecha_incidente} · {i.reportado_por}</div>
      {i.acciones_correctivas && (
        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: s2, fontSize: 11, color: t2 }}>
          <span style={{ fontWeight: 600, color: t1 }}>{t('med.correctiveActions')}</span> {i.acciones_correctivas}
        </div>
      )}
    </div>
  )
}
