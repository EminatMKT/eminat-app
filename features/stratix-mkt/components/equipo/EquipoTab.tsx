'use client'
import { useApp } from '@/shared/context/AppContext'
import { useStratix } from '../StratixContext'
import Stratix360Roster from '../roster/Stratix360Roster'
import TeamReportCard from './TeamReportCard'
import TabButton from '@/shared/components/ui/TabButton'

const SUB_TABS = [{ key: 'team', label: '👥 Team' }, { key: 'reporte', label: '💰 Report' }]

export default function EquipoTab() {
  const { border } = useApp()
  const { subVista, setSubVista, resumenHoras } = useStratix()
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
        {SUB_TABS.map(t => (
          <TabButton key={t.key} label={t.label} active={subVista === t.key} onClick={() => setSubVista(t.key)} padding="7px 16px" />
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
