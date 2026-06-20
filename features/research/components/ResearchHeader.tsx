'use client'
import { useResearchTheme } from '../theme'
import { useResearch } from './ResearchContext'

export default function ResearchHeader({ tab }: { tab: string }) {
  const { s2, border, t1, t2, t3, accent } = useResearchTheme()
  const { openNewLead, setModalImport, handleExport, handlePrint } = useResearch()
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#60A5FA20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔬</div>
        <div>
          <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: t1 }}>Eminat Research Group</div>
          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>Clinical Research Operations</div>
        </div>
      </div>
      {tab === 'leads' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={openNewLead} style={{ padding: '6px 14px', borderRadius: 8, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ New Lead</button>
          <button onClick={() => setModalImport(true)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>📥 Import</button>
          <button onClick={handleExport} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>📤 Export</button>
          <button onClick={handlePrint} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>🖨 PDF</button>
        </div>
      )}
    </div>
  )
}
