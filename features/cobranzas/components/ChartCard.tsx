'use client'
import { useApp } from '@/shared/context/AppContext'

export default function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { s1, border, t1 } = useApp()
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}
