'use client'
import { useApp } from '@/shared/context/AppContext'
import { ACTIVE_MIEMBROS_REFS } from '../../team'
import MemberAvailabilityCard from './MemberAvailabilityCard'

const MIEMBROS_ENTRIES = Object.entries(ACTIVE_MIEMBROS_REFS)

export default function SolicitudesAvailabilityView() {
  const { t1, t3 } = useApp()
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Syne', color: t1, marginBottom: 4 }}>Team availability</div>
        <div style={{ fontSize: 12, color: t3 }}>Monday to Friday · 9:00 AM — 6:00 PM · Guayaquil, Ecuador time</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {MIEMBROS_ENTRIES.map(([ref, nombre]) => (
          <MemberAvailabilityCard key={ref} refKey={ref} nombre={nombre} />
        ))}
      </div>
    </div>
  )
}
