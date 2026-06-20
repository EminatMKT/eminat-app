'use client'
import { useApp, MESES } from '@/shared/context/AppContext'
import { useStratix } from '../StratixContext'
import HoursSummaryCard from './HoursSummaryCard'

export default function HorasTab() {
  const { t1, inputStyle, esSuperAdmin } = useApp()
  const { mesHoras, setMesHoras, resumenHoras } = useStratix()
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>{esSuperAdmin ? 'Team summary' : 'Your hours'}</span>
        <select value={mesHoras} onChange={e => setMesHoras(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
          <option value="">All months</option>
          {MESES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {resumenHoras.map(r => (
          <HoursSummaryCard key={r.ref} r={r} />
        ))}
      </div>
    </div>
  )
}
