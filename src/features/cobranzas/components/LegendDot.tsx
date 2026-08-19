'use client'
import { useApp } from '@/shared/context/AppContext'

export default function LegendDot({ label, color }: { label: string; color: string }) {
  const { t3 } = useApp()
  return (
    <span style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      <span style={{ color: t3 }}>{label}</span>
    </span>
  )
}
