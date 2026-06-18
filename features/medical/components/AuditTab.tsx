'use client'
import { useApp } from '@/shared/context/AppContext'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import AuditRow from './AuditRow'

export default function AuditTab() {
  const { t3, border, inputStyle } = useApp()
  const { searchAudit, setSearchAudit, filterAuditNivel, setFilterAuditNivel, filteredAudit } = useMedical()
  const { cardStyle, hipaaShield } = useMedicalStyles()

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input placeholder="Search audit log..." value={searchAudit} onChange={e => setSearchAudit(e.target.value)} style={{ ...inputStyle, maxWidth: 300 }} />
        <select value={filterAuditNivel} onChange={e => setFilterAuditNivel(e.target.value)} style={{ ...inputStyle, maxWidth: 160 }}>
          <option value="todos">All levels</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <div style={{ flex: 1 }} />
        <div style={hipaaShield}>🔒 PHI Access Tracked</div>
      </div>

      <div style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${border}` }}>
              {['Timestamp', 'User', 'Action', 'Resource', 'Patient', 'Details', 'IP', 'Level'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{filteredAudit.map(l => <AuditRow key={l.id} log={l} />)}</tbody>
        </table>
        {filteredAudit.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: t3, fontSize: 12 }}>No records found</div>
        )}
      </div>
    </div>
  )
}
