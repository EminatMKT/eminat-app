'use client'
import { useState } from 'react'
import { useResearchTheme } from '../../theme'
import { useResearch } from '../ResearchContext'

export default function ActivityModal() {
  const { s1, border, t1, t2, t3, accent, inputStyle } = useResearchTheme()
  const { modalActivity, setModalActivity, addActivity } = useResearch()
  const [newActivity, setNewActivity] = useState({ tipo: 'email', nota: '', fecha: new Date().toISOString().split('T')[0] })
  if (!modalActivity) return null
  const lead = modalActivity

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModalActivity(null)}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 440, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Add activity</div>
          <button onClick={() => setModalActivity(null)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: 11, color: t3, marginBottom: 14 }}>Lead: <strong style={{ color: accent }}>{lead.contact_name || lead.nct}</strong></div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 4 }}>Type</label>
          <select value={newActivity.tipo} onChange={e => setNewActivity(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}>
            <option value="email">📧 Email</option><option value="llamada">📞 Call</option><option value="reunion">🤝 Meeting</option>
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 4 }}>Date</label>
          <input type="date" value={newActivity.fecha} onChange={e => setNewActivity(p => ({ ...p, fecha: e.target.value }))} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 4 }}>Note</label>
          <textarea value={newActivity.nota} onChange={e => setNewActivity(p => ({ ...p, nota: e.target.value }))} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="Activity description..." />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setModalActivity(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={async () => { await addActivity(lead.id, newActivity); setModalActivity(null) }} style={{ flex: 2, padding: '10px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save</button>
        </div>
      </div>
    </div>
  )
}
