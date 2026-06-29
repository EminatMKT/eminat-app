'use client'
import { useApp } from '@/shared/context/AppContext'

export default function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  const { s2, t1, t3 } = useApp()
  return (
    <div style={{ background: s2, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: t3, marginBottom: 2, fontFamily: 'DM Mono', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: t1 }}>{value}</div>
    </div>
  )
}
