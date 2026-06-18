'use client'
import { RESEARCH_THEME } from '../theme'
import { LEAD_FIELDS } from '../constants'
import { useResearch } from './ResearchContext'
import LeadDetailField from './LeadDetailField'

export default function LeadDetailModal() {
  const { s1, border, t1, t3, accent } = RESEARCH_THEME
  const { modalLead, setModalLead, openEditLead, setModalActivity, deleteLead, activities } = useResearch()
  if (!modalLead) return null
  const lead = modalLead
  const leadActivities = activities.filter(a => a.lead_id === lead.id)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModalLead(null)}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 600, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Lead Details</div>
            <div style={{ fontSize: 11, color: accent, fontFamily: 'DM Mono' }}>{lead.nct || '—'}</div>
          </div>
          <button onClick={() => setModalLead(null)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {LEAD_FIELDS.map(f => <LeadDetailField key={f} field={f} value={lead[f]} />)}
        </div>
        <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 8 }}>Activities</div>
          {leadActivities.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${border}` }}>
              <span style={{ fontSize: 14 }}>{a.tipo === 'email' ? '📧' : a.tipo === 'llamada' ? '📞' : '🤝'}</span>
              <div><div style={{ fontSize: 11, color: t1 }}>{a.nota}</div><div style={{ fontSize: 9, color: t3 }}>{a.fecha}</div></div>
            </div>
          ))}
          {leadActivities.length === 0 && <div style={{ fontSize: 11, color: t3 }}>No activities recorded</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => openEditLead(lead)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${accent}`, background: 'transparent', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✏️ Edit</button>
          <button onClick={() => { setModalLead(null); setModalActivity(lead) }} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#60A5FA', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>📞 Activity</button>
          <button onClick={() => { if (confirm('Delete this lead?')) { deleteLead(lead.id); setModalLead(null) } }} style={{ padding: '10px 16px', borderRadius: 10, background: '#F8717120', color: '#F87171', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🗑</button>
        </div>
      </div>
    </div>
  )
}
