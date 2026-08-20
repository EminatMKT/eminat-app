'use client'
import { useApp } from '@/shared/context/AppContext'

export default function DayHeader({ d, hoy }: { d: Date; hoy: Date }) {
  const { accent, border, t3 } = useApp()
  const esHoy = d.toDateString() === hoy.toDateString()
  const esFinde = d.getDay() === 0 || d.getDay() === 6
  return (
    <div style={{ minWidth: 44, textAlign: 'center', padding: '8px 4px', fontSize: 9, color: esHoy ? accent : esFinde ? '#F87171' : t3, fontFamily: 'DM Mono', background: esHoy ? `${accent}10` : esFinde ? 'rgba(248,113,113,0.05)' : 'transparent', borderRight: `1px solid ${border}` }}>
      <div style={{ fontWeight: esHoy ? 700 : 400 }}>{d.getDate()}</div>
      <div>{['D', 'L', 'M', 'X', 'J', 'V', 'S'][d.getDay()]}</div>
    </div>
  )
}
