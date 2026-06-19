'use client'
import { useApp } from '@/shared/context/AppContext'
import { useStratix } from '../StratixContext'
import Stratix360Roster from '../roster/Stratix360Roster'
import TeamReportCard from './TeamReportCard'

const SUB_TABS = [{ key: 'team', label: '👥 Team' }, { key: 'reporte', label: '💰 Report' }]

export default function EquipoTab() {
  const { border, accent, t1, t3 } = useApp()
  const { subVista, setSubVista, resumenHoras } = useStratix()
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSubVista(t.key)} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: subVista === t.key ? t1 : t3, borderBottom: subVista === t.key ? `2px solid ${accent}` : '2px solid transparent' }}>{t.label}</button>
        ))}
      </div>
      {subVista !== 'reporte' ? (
        <Stratix360Roster />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {resumenHoras.map(r => (
            <TeamReportCard key={r.ref} r={r} />
          ))}
        </div>
      )}
    </div>
  )
}
