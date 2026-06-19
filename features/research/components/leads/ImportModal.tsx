'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { RESEARCH_THEME } from '../../theme'
import { useResearch } from '../ResearchContext'

export default function ImportModal() {
  const { s1, s2, border, t1, t2, t3 } = RESEARCH_THEME
  const { mostrarMensaje } = useApp()
  const { modalImport, setModalImport, confirmImport } = useResearch()
  const [importPreview, setImportPreview] = useState<any[] | null>(null)
  if (!modalImport) return null

  const close = () => { setModalImport(false); setImportPreview(null) }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) { mostrarMensaje('error', 'Archivo vacío'); return }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g, '_').replace(/#/g, ''))
    const records = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const obj: any = {}
      headers.forEach((h, i) => { obj[h] = vals[i] || '' })
      return obj
    })
    setImportPreview(records)
  }

  async function confirm() {
    if (!importPreview) return
    const ok = await confirmImport(importPreview)
    if (ok) close()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 600, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Import Excel/CSV</div>
          <button onClick={close} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        {!importPreview ? (
          <div style={{ border: `2px dashed ${border}`, borderRadius: 14, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 12, color: t3, marginBottom: 12 }}>Select a CSV or Excel file</div>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImportFile} style={{ fontSize: 12 }} />
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: '#34D399', marginBottom: 12 }}>✓ {importPreview.length} records detected</div>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: `1px solid ${border}`, borderRadius: 10, marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead><tr style={{ background: s2 }}>
                  {Object.keys(importPreview[0] || {}).slice(0, 6).map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: t3, borderBottom: `1px solid ${border}` }}>{h}</th>)}
                </tr></thead>
                <tbody>{importPreview.slice(0, 5).map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                    {Object.values(r).slice(0, 6).map((v: any, j) => <td key={j} style={{ padding: '5px 8px', color: t2, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</td>)}
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setImportPreview(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirm} style={{ flex: 2, padding: '10px', borderRadius: 10, background: '#34D399', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Confirm import ({importPreview.length})</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
