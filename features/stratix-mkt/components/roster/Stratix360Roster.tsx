'use client'
import { useApp } from '@/shared/context/AppContext'
import { isExcludedFromStratix360, normTeamName } from '../../team'
import { AREA_META, STRATIX360_ROSTER } from './roster-data'
import RosterCard from './RosterCard'

export default function Stratix360Roster() {
  const { accent, usuarios } = useApp()

  // Build a name→user index from usuarios, filtering OUT any excluded person
  // up front so a Javier/Jonathan row in the table cannot enrich an entry.
  const userByName = new Map<string, any>()
  for (const u of usuarios) {
    if (isExcludedFromStratix360(u)) continue
    const key = normTeamName(`${u.nombre || ''} ${u.apellido || ''}`)
    if (key) userByName.set(key, u)
  }

  const enriched = STRATIX360_ROSTER.map((entry) => ({
    entry,
    user: userByName.get(normTeamName(entry.nombre)) ?? null,
  }))

  const director = enriched.find((e) => e.entry.area === 'director')
  const groups = (['diseno', 'edicion', 'automatizacion', 'cuentas'] as const).map((area) => ({
    area,
    meta: AREA_META[area],
    members: enriched
      .filter((e) => e.entry.area === area)
      .sort((a, b) => (a.entry.leader === b.entry.leader ? 0 : a.entry.leader ? -1 : 1)),
  }))

  return (
    <div>
      {/* Director de Marketing */}
      {director && (
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: accent,
              marginBottom: 12,
              padding: '4px 12px',
              background: `${accent}15`,
              borderRadius: 20,
              display: 'inline-block',
            }}
          >
            Director de Marketing — sobre todas las áreas
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            <RosterCard entry={director.entry} user={director.user} />
          </div>
        </div>
      )}

      {/* Áreas */}
      {groups.map(({ area, meta, members }) => {
        if (!members.length) return null
        return (
          <div key={area} style={{ marginBottom: 28 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: meta.color,
                marginBottom: 12,
                padding: '4px 12px',
                background: `${meta.color}15`,
                borderRadius: 20,
                display: 'inline-block',
              }}
            >
              {meta.icon} {meta.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {members.map(({ entry, user }) => (
                <RosterCard key={entry.nombre} entry={entry} user={user} accentOverride={meta.color} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
