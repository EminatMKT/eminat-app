'use client'
import { useApp } from '@/shared/context/AppContext'
import MemberAvailabilityCard from '../MemberAvailabilityCard'

export default function SolicitudesAvailabilityView() {
  const { t1, t3, miembrosAsignables } = useApp()
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Syne', color: t1, marginBottom: 4 }}>Team availability</div>
        <div style={{ fontSize: 12, color: t3 }}>Monday to Friday · 9:00 AM — 6:00 PM · Guayaquil, Ecuador time</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {miembrosAsignables.map((m) => (
          <MemberAvailabilityCard key={m.id} userId={m.id} nombre={m.nombre} />
        ))}
      </div>
    </div>
  )
}
