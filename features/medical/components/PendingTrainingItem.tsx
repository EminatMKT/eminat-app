'use client'
import { useApp } from '@/shared/context/AppContext'
import Badge from './Badge'
import type { HipaaTraining } from '../types'

export default function PendingTrainingItem({ training: t }: { training: HipaaTraining }) {
  const { t1, t3, border } = useApp()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${border}` }}>
      <span style={{ fontSize: 14 }}>{t.estado === 'vencido' ? '⚠️' : '📚'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t1 }}>{t.usuario_nombre}</div>
        <div style={{ fontSize: 10, color: t3 }}>{t.curso}</div>
      </div>
      <Badge color={t.estado === 'vencido' ? '#F87171' : '#FBB040'}>{t.estado}</Badge>
    </div>
  )
}
