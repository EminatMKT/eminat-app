'use client'
import { useApp } from '@/shared/context/AppContext'

export default function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const { s1, border, t3 } = useApp()
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'DM Mono', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  )
}
