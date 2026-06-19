'use client'
import { useApp } from '@/shared/context/AppContext'

type Advantage = { icon: string; title: string; desc: string }

export default function AdvantageRow({ v }: { v: Advantage }) {
  const { accent, t1, t2 } = useApp()
  return (
    <div style={{ display: 'flex', gap: 10, padding: '8px 10px', borderRadius: 10, background: `${accent}08` }}>
      <span style={{ fontSize: 20 }}>{v.icon}</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: t1 }}>{v.title}</div>
        <div style={{ fontSize: 10, color: t2 }}>{v.desc}</div>
      </div>
    </div>
  )
}
