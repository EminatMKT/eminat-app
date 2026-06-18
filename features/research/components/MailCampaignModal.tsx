'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { supabase } from '@/shared/db/supabase'
import { RESEARCH_THEME, inputStyle } from '../theme'
import { useResearch } from './ResearchContext'

export default function MailCampaignModal() {
  const { s1, s2, border, t1, t2, t3, accent } = RESEARCH_THEME
  const { mostrarMensaje } = useApp()
  const { mailModal, setMailModal, leads, setCampaigns } = useResearch()

  const seed = mailModal?.campaign
  const [mailCampaign, setMailCampaign] = useState<any>({ nombre: seed?.nombre || '', asunto: seed?.asunto || '', contenido: seed?.contenido || '', estado: seed?.estado || 'Borrador' })
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(seed?.id ?? null)
  const [mailStep, setMailStep] = useState(mailModal?.step ?? 0)
  const [mailRecipients, setMailRecipients] = useState<string[]>([])
  const [mailRecipientSearch, setMailRecipientSearch] = useState('')
  const [mailSending, setMailSending] = useState(false)

  if (!mailModal) return null
  const close = () => setMailModal(null)

  async function upsert(payload: any) {
    if (editingCampaignId) {
      const { data } = await supabase.from('research_campaigns').update(payload).eq('id', editingCampaignId).select()
      if (data) setCampaigns(prev => prev.map(c => c.id === editingCampaignId ? data[0] : c))
    } else {
      const { data } = await supabase.from('research_campaigns').insert([payload]).select()
      if (data) { setCampaigns(prev => [data[0], ...prev]); setEditingCampaignId(data[0].id) }
    }
  }

  const draftPayload = () => ({ nombre: mailCampaign.nombre, asunto: mailCampaign.asunto, contenido: mailCampaign.contenido, tipo: 'Email', estado: 'Borrador', total_enviados: 0 })

  async function saveDraft(closeAfter: boolean) {
    await upsert(draftPayload())
    if (closeAfter) close()
    mostrarMensaje('ok', 'Draft saved')
  }

  async function sendNow() {
    setMailSending(true)
    try {
      const recipientEmails = leads.filter(l => mailRecipients.includes(l.id)).map(l => l.email).filter(Boolean)
      const htmlContent = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#4F46E5;padding:24px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:20px">Eminat Research Group</h1></div><div style="padding:28px;background:#ffffff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px">${mailCampaign.contenido.split('\n').map((p: string) => `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px">${p}</p>`).join('')}</div><div style="text-align:center;padding:20px;font-size:11px;color:#9CA3AF"><p>Eminat Research Group</p></div></div>`
      try { await fetch('/api/mail/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: recipientEmails, subject: mailCampaign.asunto, html: htmlContent }) }) } catch {}
      await upsert({ nombre: mailCampaign.nombre, asunto: mailCampaign.asunto, contenido: mailCampaign.contenido, tipo: 'Email', estado: 'Enviado', total_enviados: recipientEmails.length, fecha_envio: new Date().toISOString() })
      close()
      mostrarMensaje('ok', `Campaign sent to ${recipientEmails.length} recipients`)
    } catch {
      mostrarMensaje('error', 'Failed to send')
    }
    setMailSending(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 680, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>{editingCampaignId ? 'Edit campaign' : 'New campaign'}</div>
          <button onClick={close} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>&#10005;</button>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {['Content', 'Recipients', 'Preview'].map((label, i) => (
            <button key={label} onClick={() => setMailStep(i)} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', background: mailStep === i ? `${accent}15` : 'transparent', color: mailStep === i ? accent : t3 }}>
              {i + 1}. {label}
            </button>
          ))}
        </div>

        {mailStep === 0 && (
          <div>
            <div style={{ marginBottom: 14 }}><label style={{ fontSize: 11, color: t2, display: 'block', marginBottom: 4, fontWeight: 600 }}>Campaign name</label><input value={mailCampaign.nombre} onChange={e => setMailCampaign((p: any) => ({ ...p, nombre: e.target.value }))} style={inputStyle} placeholder="Ej: Newsletter Abril 2026" /></div>
            <div style={{ marginBottom: 14 }}><label style={{ fontSize: 11, color: t2, display: 'block', marginBottom: 4, fontWeight: 600 }}>Email subject</label><input value={mailCampaign.asunto} onChange={e => setMailCampaign((p: any) => ({ ...p, asunto: e.target.value }))} style={inputStyle} placeholder="Ej: Nuevas oportunidades de clinical trials" /></div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: t2, display: 'block', marginBottom: 4, fontWeight: 600 }}>Email content</label>
              <textarea value={mailCampaign.contenido} onChange={e => setMailCampaign((p: any) => ({ ...p, contenido: e.target.value }))} style={{ ...inputStyle, minHeight: 200, resize: 'vertical', lineHeight: 1.7 }} placeholder="Write the email content. Each line will become a separate paragraph." />
              <div style={{ fontSize: 10, color: t3, marginTop: 4 }}>Tip: Each line break becomes a separate paragraph in the final email.</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={close} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <div style={{ flex: 1 }} />
              <button onClick={() => saveDraft(false)} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t1, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save draft</button>
              <button onClick={() => setMailStep(1)} style={{ padding: '10px 24px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Siguiente &rarr;</button>
            </div>
          </div>
        )}

        {mailStep === 1 && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
              <input placeholder="Search leads by title, sponsor, email, NCT..." value={mailRecipientSearch} onChange={e => setMailRecipientSearch(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => setMailRecipients(leads.filter(l => l.email).map(l => l.id))} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>Select all</button>
              <button onClick={() => setMailRecipients([])} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>Clear</button>
            </div>
            <div style={{ fontSize: 12, color: t1, fontWeight: 600, marginBottom: 10 }}>{mailRecipients.length} recipients selected <span style={{ color: t3, fontWeight: 400 }}>of {leads.filter(l => l.email).length} with email</span></div>
            <div style={{ maxHeight: 320, overflowY: 'auto', border: `1px solid ${border}`, borderRadius: 12 }}>
              {leads.filter(l => l.email).filter(l => !mailRecipientSearch || `${l.official_title} ${l.lead_sponsor} ${l.email} ${l.nct}`.toLowerCase().includes(mailRecipientSearch.toLowerCase())).map(l => (
                <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: `1px solid ${border}`, cursor: 'pointer', background: mailRecipients.includes(l.id) ? `${accent}06` : 'transparent' }}>
                  <input type="checkbox" checked={mailRecipients.includes(l.id)} onChange={e => { if (e.target.checked) setMailRecipients(p => [...p, l.id]); else setMailRecipients(p => p.filter(x => x !== l.id)) }} style={{ accentColor: accent }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.official_title || l.conditions || '—'}</div>
                    <div style={{ fontSize: 10, color: t3 }}>{l.lead_sponsor} · {l.nct}</div>
                  </div>
                  <div style={{ fontSize: 10, color: t2, fontFamily: 'DM Mono' }}>{l.email}</div>
                </label>
              ))}
              {leads.filter(l => l.email).length === 0 && <div style={{ padding: 32, textAlign: 'center', color: t3, fontSize: 12 }}>No leads with email</div>}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setMailStep(0)} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>&larr; Back</button>
              <div style={{ flex: 1 }} />
              <button onClick={() => setMailStep(2)} style={{ padding: '10px 24px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Preview &rarr;</button>
            </div>
          </div>
        )}

        {mailStep === 2 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: s2, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne', color: accent }}>{mailRecipients.length}</div>
                <div style={{ fontSize: 10, color: t3 }}>Recipients</div>
              </div>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: s2, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mailCampaign.asunto || '(no subject)'}</div>
                <div style={{ fontSize: 10, color: t3 }}>Subject</div>
              </div>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: s2, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t1 }}>{mailCampaign.nombre || '(untitled)'}</div>
                <div style={{ fontSize: 10, color: t3 }}>Campaign</div>
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: t2, marginBottom: 8 }}>Email preview:</div>
            <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ background: '#4F46E5', padding: '18px 24px', textAlign: 'center' }}>
                <div style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>Eminat Research Group</div>
              </div>
              <div style={{ padding: '24px', background: '#FFFFFF' }}>
                {mailCampaign.contenido ? mailCampaign.contenido.split('\n').map((p: string, i: number) => (
                  <p key={i} style={{ color: '#374151', fontSize: 14, lineHeight: 1.7, margin: '0 0 12px' }}>{p}</p>
                )) : <p style={{ color: '#9CA3AF', fontSize: 14 }}>(no content)</p>}
              </div>
              <div style={{ padding: '14px 24px', background: '#F9FAFB', textAlign: 'center', fontSize: 10, color: '#9CA3AF', borderTop: `1px solid ${border}` }}>
                Eminat Research Group — Clinical Research Operations
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMailStep(1)} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>&larr; Back</button>
              <div style={{ flex: 1 }} />
              <button onClick={() => saveDraft(true)} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t1, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save draft</button>
              <button disabled={mailSending || mailRecipients.length === 0} onClick={sendNow} style={{ padding: '10px 24px', borderRadius: 10, background: mailSending || mailRecipients.length === 0 ? '#9CA3AF' : '#34D399', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: mailSending || mailRecipients.length === 0 ? 'not-allowed' : 'pointer' }}>
                {mailSending ? 'Sending...' : `Send now (${mailRecipients.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
