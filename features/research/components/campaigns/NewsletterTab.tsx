'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { supabase } from '@/shared/db/supabase'
import { RESEARCH_THEME, inputStyle } from '../../theme'
import { useResearch } from '../ResearchContext'
import ContactCheckRow from './ContactCheckRow'
import NewsletterStepCard from './NewsletterStepCard'
import StageBadge from '../StageBadge'

export default function NewsletterTab() {
  const { s1, s2, border, t1, t2, t3, accent } = RESEARCH_THEME
  const { mostrarMensaje } = useApp()
  const { leads, setCampaigns } = useResearch()
  const [nlStep, setNlStep] = useState(0)
  const [nlSelected, setNlSelected] = useState<string[]>([])
  const [nlSearch, setNlSearch] = useState('')
  const [nlCampaign, setNlCampaign] = useState({ subject: '', content: '', type: 'Email' })

  const toggle = (id: string) => setNlSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const visible = leads.filter(l => !nlSearch || (l.contact_name || '').toLowerCase().includes(nlSearch.toLowerCase()) || (l.email || '').toLowerCase().includes(nlSearch.toLowerCase()) || (l.phone || '').includes(nlSearch))

  async function send() {
    const { data: camp } = await supabase.from('research_campaigns').insert([{ nombre: nlCampaign.subject, asunto: nlCampaign.subject, contenido: nlCampaign.content, tipo: nlCampaign.type, estado: 'Enviado', total_enviados: nlSelected.length }]).select()
    if (camp?.[0]) {
      const recs = nlSelected.map(lid => ({ campaign_id: camp[0].id, lead_id: lid, status: 'sent' }))
      await supabase.from('research_campaign_recipients').insert(recs)
      setCampaigns(prev => [camp[0], ...prev])
    }
    mostrarMensaje('ok', `Campaign sent to ${nlSelected.length} contacts`)
    setNlStep(3)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['Contacts', 'Campaign', 'Preview', 'Results'].map((step, i) => (
          <NewsletterStepCard key={step} index={i} label={step} icon={['👥', '⚙️', '👁', '📊'][i]} active={nlStep === i} onClick={() => setNlStep(i)} />
        ))}
      </div>
      {nlStep === 0 && (
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <input value={nlSearch} onChange={e => setNlSearch(e.target.value)} placeholder="Search by name, email, phone..." style={{ ...inputStyle, marginBottom: 12 }} />
          <div style={{ fontSize: 11, color: t3, marginBottom: 8 }}>{nlSelected.length} contacts selected</div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {visible.map(l => (
              <ContactCheckRow key={l.id} checked={nlSelected.includes(l.id)} onToggle={() => toggle(l.id)}
                primary={l.contact_name || '—'} secondary={`${l.email} · ${l.phone || 'No phone'}`} right={<StageBadge stage={l.stage} />} />
            ))}
          </div>
          <button onClick={() => setNlStep(1)} disabled={nlSelected.length === 0} style={{ marginTop: 12, padding: '10px 24px', borderRadius: 10, background: nlSelected.length > 0 ? accent : t3, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: nlSelected.length > 0 ? 'pointer' : 'default' }}>Next →</button>
        </div>
      )}
      {nlStep === 1 && (
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: 14 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Subject</label><input value={nlCampaign.subject} onChange={e => setNlCampaign(p => ({ ...p, subject: e.target.value }))} style={inputStyle} placeholder="Campaign subject" /></div>
          <div style={{ marginBottom: 14 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Type</label>
            <select value={nlCampaign.type} onChange={e => setNlCampaign(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
              <option value="Email">Email</option><option value="Reunión">Meeting</option><option value="Llamada">Call</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Content</label><textarea value={nlCampaign.content} onChange={e => setNlCampaign(p => ({ ...p, content: e.target.value }))} style={{ ...inputStyle, minHeight: 140, resize: 'vertical' }} placeholder="Write the content..." /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setNlStep(0)} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>← Back</button>
            <button onClick={() => setNlStep(2)} style={{ padding: '10px 24px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Next →</button>
          </div>
        </div>
      )}
      {nlStep === 2 && (
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t1, marginBottom: 16 }}>Preview</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div><span style={{ fontSize: 10, color: t3 }}>Type:</span> <span style={{ fontSize: 12, color: t1, fontWeight: 600 }}>{nlCampaign.type}</span></div>
            <div><span style={{ fontSize: 10, color: t3 }}>Recipients:</span> <span style={{ fontSize: 12, color: accent, fontWeight: 600 }}>{nlSelected.length}</span></div>
          </div>
          <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Subject</div><div style={{ fontSize: 13, color: t1, fontWeight: 600 }}>{nlCampaign.subject || '(no subject)'}</div></div>
          <div style={{ marginBottom: 14, padding: 14, background: s2, borderRadius: 10 }}><div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Content</div><div style={{ fontSize: 12, color: t2, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{nlCampaign.content || '(no content)'}</div></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setNlStep(1)} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>← Back</button>
            <button onClick={send} style={{ padding: '10px 24px', borderRadius: 10, background: '#34D399', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Send campaign ✓</button>
          </div>
        </div>
      )}
      {nlStep === 3 && (
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 30, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: '#34D399', marginBottom: 8 }}>Campaign sent</div>
          <div style={{ fontSize: 13, color: t3, marginBottom: 20 }}>{nlSelected.length} contacts reached · {nlCampaign.type}</div>
          <button onClick={() => { setNlStep(0); setNlSelected([]); setNlCampaign({ subject: '', content: '', type: 'Email' }) }} style={{ padding: '10px 24px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>New campaign</button>
        </div>
      )}
    </div>
  )
}
