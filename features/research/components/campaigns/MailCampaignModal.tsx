'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { supabase } from '@/shared/db/supabase'
import { RESEARCH_THEME } from '../../theme'
import { escapeHtml } from '../../html'
import { useResearch } from '../ResearchContext'
import MailContentStep from './MailContentStep'
import MailRecipientsStep from './MailRecipientsStep'
import MailPreviewStep from './MailPreviewStep'

export default function MailCampaignModal() {
  const { s1, border, t1, t3, accent } = RESEARCH_THEME
  const { mostrarMensaje } = useApp()
  const { mailModal, setMailModal, leads, setCampaigns } = useResearch()

  const seed = mailModal?.campaign
  const [campaign, setCampaign] = useState<any>({ nombre: seed?.nombre || '', asunto: seed?.asunto || '', contenido: seed?.contenido || '', estado: seed?.estado || 'Borrador' })
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(seed?.id ?? null)
  const [step, setStep] = useState(mailModal?.step ?? 0)
  const [recipients, setRecipients] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)

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

  async function saveDraft(closeAfter: boolean) {
    await upsert({ nombre: campaign.nombre, asunto: campaign.asunto, contenido: campaign.contenido, tipo: 'Email', estado: 'Borrador', total_enviados: 0 })
    if (closeAfter) close()
    mostrarMensaje('ok', 'Draft saved')
  }

  async function sendNow() {
    setSending(true)
    try {
      const recipientEmails = leads.filter(l => recipients.includes(l.id)).map(l => l.email).filter(Boolean)
      const htmlContent = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#4F46E5;padding:24px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:20px">Eminat Research Group</h1></div><div style="padding:28px;background:#ffffff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px">${campaign.contenido.split('\n').map((p: string) => `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px">${escapeHtml(p)}</p>`).join('')}</div><div style="text-align:center;padding:20px;font-size:11px;color:#9CA3AF"><p>Eminat Research Group</p></div></div>`
      try { await fetch('/api/mail/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: recipientEmails, subject: campaign.asunto, html: htmlContent }) }) } catch {}
      await upsert({ nombre: campaign.nombre, asunto: campaign.asunto, contenido: campaign.contenido, tipo: 'Email', estado: 'Enviado', total_enviados: recipientEmails.length, fecha_envio: new Date().toISOString() })
      close()
      mostrarMensaje('ok', `Campaign sent to ${recipientEmails.length} recipients`)
    } catch {
      mostrarMensaje('error', 'Failed to send')
    }
    setSending(false)
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
            <button key={label} onClick={() => setStep(i)} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', background: step === i ? `${accent}15` : 'transparent', color: step === i ? accent : t3 }}>
              {i + 1}. {label}
            </button>
          ))}
        </div>

        {step === 0 && <MailContentStep campaign={campaign} setCampaign={setCampaign} onCancel={close} onSaveDraft={() => saveDraft(false)} onNext={() => setStep(1)} />}
        {step === 1 && <MailRecipientsStep recipients={recipients} setRecipients={setRecipients} search={search} setSearch={setSearch} onBack={() => setStep(0)} onNext={() => setStep(2)} />}
        {step === 2 && <MailPreviewStep campaign={campaign} recipientsCount={recipients.length} sending={sending} onBack={() => setStep(1)} onSaveDraft={() => saveDraft(true)} onSend={sendNow} />}
      </div>
    </div>
  )
}
