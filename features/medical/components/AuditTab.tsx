'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import AuditRow from './AuditRow'

const COLS = ['med.colTimestamp', 'med.colUser', 'med.colAction', 'med.colResource', 'med.colPatient', 'med.colDetails', 'med.colIp', 'med.colLevel'] as const

export default function AuditTab() {
  const { t3, border, inputStyle } = useApp()
  const { t } = useT()
  const { searchAudit, setSearchAudit, filterAuditNivel, setFilterAuditNivel, filteredAudit } = useMedical()
  const { cardStyle, hipaaShield } = useMedicalStyles()

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input placeholder={t('med.searchAudit')} value={searchAudit} onChange={e => setSearchAudit(e.target.value)} style={{ ...inputStyle, maxWidth: 300 }} />
        <select value={filterAuditNivel} onChange={e => setFilterAuditNivel(e.target.value)} style={{ ...inputStyle, maxWidth: 160 }}>
          <option value="todos">{t('med.levelAll')}</option>
          <option value="info">{t('med.levelInfo')}</option>
          <option value="warning">{t('med.levelWarning')}</option>
          <option value="critical">{t('med.levelCritical')}</option>
        </select>
        <div style={{ flex: 1 }} />
        <div style={hipaaShield}>🔒 {t('med.phiTracked')}</div>
      </div>

      <div style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${border}` }}>
              {COLS.map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>{filteredAudit.map(l => <AuditRow key={l.id} log={l} />)}</tbody>
        </table>
        {filteredAudit.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: t3, fontSize: 12 }}>{t('med.noRecords')}</div>
        )}
      </div>
    </div>
  )
}
