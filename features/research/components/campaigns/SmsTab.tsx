'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { researchRepo } from '@/shared/data'
import { RESEARCH_THEME, inputStyle } from '../../theme'
import { useResearch } from '../ResearchContext'
import ContactCheckRow from './ContactCheckRow'
import SmsHistoryItem from './SmsHistoryItem'

export default function SmsTab() {
  const { s1, border, t1, t3 } = RESEARCH_THEME
  const { mostrarMensaje } = useApp()
  const { leads, campaigns, setCampaigns } = useResearch()
  const [smsSelected, setSmsSelected] = useState<string[]>([])
  const [smsMessage, setSmsMessage] = useState('')
  const [smsSearch, setSmsSearch] = useState('')

  const toggle = (id: string) => setSmsSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const visible = leads.filter(l => l.phone && (!smsSearch || (l.contact_name || '').toLowerCase().includes(smsSearch.toLowerCase())))
  const history = campaigns.filter(c => c.tipo === 'SMS')

  async function send() {
    const { data: camp } = await researchRepo.insertCampaign({ nombre: 'SMS — ' + new Date().toLocaleDateString(), tipo: 'SMS', contenido: smsMessage, estado: 'Enviado', total_enviados: smsSelected.length })
    if (camp?.[0]) {
      const recs = smsSelected.map(lid => ({ campaign_id: camp[0].id, lead_id: lid, status: 'sent' }))
      await researchRepo.insertRecipients(recs)
      setCampaigns(prev => [camp[0], ...prev])
    }
    mostrarMensaje('ok', `SMS sent to ${smsSelected.length} contacts`)
    setSmsMessage('')
    setSmsSelected([])
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 12 }}>Select contacts</div>
        <input value={smsSearch} onChange={e => setSmsSearch(e.target.value)} placeholder="Search..." style={{ ...inputStyle, marginBottom: 10 }} />
        <div style={{ fontSize: 10, color: t3, marginBottom: 6 }}>{smsSelected.length} selected</div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {visible.map(l => (
            <ContactCheckRow key={l.id} checked={smsSelected.includes(l.id)} onToggle={() => toggle(l.id)} primary={l.contact_name} secondary={<span style={{ fontFamily: 'DM Mono' }}>{l.phone}</span>} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, flex: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 12 }}>SMS Message</div>
          <textarea value={smsMessage} onChange={e => { if (e.target.value.length <= 160) setSmsMessage(e.target.value) }} placeholder="Write your message..." style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 10, color: smsMessage.length > 140 ? '#F87171' : t3 }}>{smsMessage.length}/160 characters</span>
            <button onClick={send} disabled={smsSelected.length === 0 || !smsMessage} style={{ padding: '8px 20px', borderRadius: 8, background: smsSelected.length > 0 && smsMessage ? '#34D399' : t3, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: smsSelected.length > 0 && smsMessage ? 'pointer' : 'default' }}>Send SMS</button>
          </div>
        </div>
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 12 }}>SMS History</div>
          {history.slice(0, 5).map(c => <SmsHistoryItem key={c.id} campaign={c} />)}
          {history.length === 0 && <div style={{ color: t3, fontSize: 11, textAlign: 'center', padding: 20 }}>No history</div>}
        </div>
      </div>
    </div>
  )
}
