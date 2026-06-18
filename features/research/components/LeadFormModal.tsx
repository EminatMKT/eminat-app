'use client'
import { RESEARCH_THEME, inputStyle } from '../theme'
import { LEAD_FIELDS, FIELD_LABELS, PIPELINE_COLS } from '../constants'
import { useResearch } from './ResearchContext'

export default function LeadFormModal() {
  const { s1, border, t1, t2, t3, accent } = RESEARCH_THEME
  const { modalNewLead, newLead, setNewLead, editingLead, closeLeadForm, saveLead } = useResearch()
  if (!modalNewLead) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={closeLeadForm}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 600, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>{editingLead ? 'Edit Lead' : 'New Lead'}</div>
          <button onClick={closeLeadForm} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {LEAD_FIELDS.map(f => (
            <div key={f} style={{ ...(f === 'official_title' || f === 'notes' || f === 'note' ? { gridColumn: '1 / -1' } : {}) }}>
              <label style={{ fontSize: 10, color: t3, display: 'block', marginBottom: 4 }}>{FIELD_LABELS[f]}</label>
              {f === 'stage' ? (
                <select value={newLead[f] || ''} onChange={e => setNewLead((p: any) => ({ ...p, [f]: e.target.value }))} style={inputStyle}>
                  <option value="">Select</option>
                  {PIPELINE_COLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : f === 'notes' || f === 'note' ? (
                <textarea value={newLead[f] || ''} onChange={e => setNewLead((p: any) => ({ ...p, [f]: e.target.value }))} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
              ) : (
                <input value={newLead[f] || ''} onChange={e => setNewLead((p: any) => ({ ...p, [f]: e.target.value }))} style={inputStyle} />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={closeLeadForm} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={async () => { await saveLead(newLead); closeLeadForm() }} style={{ flex: 2, padding: '10px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{editingLead ? 'Save changes' : 'Create lead'}</button>
        </div>
      </div>
    </div>
  )
}
