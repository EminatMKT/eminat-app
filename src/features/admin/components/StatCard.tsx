'use client'
import { useApp } from '@/shared/context/AppContext'
import { StaggerItem, AnimatedNumber } from '@/shared/motion'

export default function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const { s1, border, t3 } = useApp()
  return (
    <StaggerItem style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, color }}><AnimatedNumber value={value} /></div>
      <div style={{ fontSize: 11, color: t3, marginTop: 4 }}>{label}</div>
    </StaggerItem>
  )
}
