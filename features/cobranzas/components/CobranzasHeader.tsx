'use client'
import { useApp, MESES } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { useCobranzas } from './CobranzasContext'

export default function CobranzasHeader() {
  const { s2, border, t1, t2, t3, accent, inputStyle } = useApp()
  const { t } = useT()
  const { cobMes, setCobMes, setCobModalImport, handleExport, handlePrint, setCobModalAdd, setCobNewRecord } = useCobranzas()
  const selectStyle = { ...inputStyle, width: 'auto', padding: '6px 12px', fontSize: 12 }
  const ghostBtn = { padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', fontWeight: 600 } as const

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💳</div>
        <div>
          <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: t1 }}>{t('cob.billingDashboard')}</div>
          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{t('cob.subtitle')}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <select value={cobMes} onChange={e => setCobMes(e.target.value)} style={selectStyle}>
          {MESES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={() => setCobModalImport(true)} style={ghostBtn}>📥 {t('cob.importCsv')}</button>
        <button onClick={handleExport} style={ghostBtn}>📤 {t('cob.exportCsv')}</button>
        <button onClick={handlePrint} style={ghostBtn}>🖨 {t('cob.printPdf')}</button>
        <button onClick={() => { setCobNewRecord({}); setCobModalAdd(true) }} style={{ padding: '6px 14px', borderRadius: 8, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t('cob.add')}</button>
      </div>
    </div>
  )
}
