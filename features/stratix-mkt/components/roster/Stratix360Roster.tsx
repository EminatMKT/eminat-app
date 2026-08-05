'use client'
import { useApp } from '@/shared/context/AppContext'
import RosterCard from './RosterCard'

export default function Stratix360Roster() {
  const { accent, equipoMarketing, usuarios } = useApp()
  const liderId = usuarios.find((u) => u.equipos?.lider_id)?.equipos?.lider_id ?? null

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: accent, marginBottom: 12, padding: '4px 12px', background: `${accent}15`, borderRadius: 20, display: 'inline-block' }}>
        {/* i18n-ignore */}Equipo de Marketing
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {equipoMarketing.map((u) => (
          <RosterCard key={u.id} user={u} esLider={u.id === liderId} />
        ))}
      </div>
    </div>
  )
}
