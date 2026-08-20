'use client'
import { useApp } from '@/shared/context/AppContext'

type Item = { label: string; value: number; icon: string; color: string }

export default function ContentSummaryCard({ item }: { item: Item }) {
  const { border, t3 } = useApp()
  return (
    <div style={{ padding: '16px', borderRadius: 12, border: `1px solid ${border}`, textAlign: 'center' }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne', color: item.color }}>{item.value}</div>
      <div style={{ fontSize: 10, color: t3, marginTop: 4 }}>{item.label}</div>
    </div>
  )
}
