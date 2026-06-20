'use client'
import type { Dispatch, SetStateAction } from 'react'
import { useResearchTheme } from '../../theme'

type Props = {
  campaign: any
  setCampaign: Dispatch<SetStateAction<any>>
  onCancel: () => void
  onSaveDraft: () => void
  onNext: () => void
}

export default function MailContentStep({ campaign, setCampaign, onCancel, onSaveDraft, onNext }: Props) {
  const { border, t1, t2, t3, accent, inputStyle } = useResearchTheme()
  return (
    <div>
      <div style={{ marginBottom: 14 }}><label style={{ fontSize: 11, color: t2, display: 'block', marginBottom: 4, fontWeight: 600 }}>Campaign name</label><input value={campaign.nombre} onChange={e => setCampaign((p: any) => ({ ...p, nombre: e.target.value }))} style={inputStyle} placeholder="Ej: Newsletter Abril 2026" /></div>
      <div style={{ marginBottom: 14 }}><label style={{ fontSize: 11, color: t2, display: 'block', marginBottom: 4, fontWeight: 600 }}>Email subject</label><input value={campaign.asunto} onChange={e => setCampaign((p: any) => ({ ...p, asunto: e.target.value }))} style={inputStyle} placeholder="Ej: Nuevas oportunidades de clinical trials" /></div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: t2, display: 'block', marginBottom: 4, fontWeight: 600 }}>Email content</label>
        <textarea value={campaign.contenido} onChange={e => setCampaign((p: any) => ({ ...p, contenido: e.target.value }))} style={{ ...inputStyle, minHeight: 200, resize: 'vertical', lineHeight: 1.7 }} placeholder="Write the email content. Each line will become a separate paragraph." />
        <div style={{ fontSize: 10, color: t3, marginTop: 4 }}>Tip: Each line break becomes a separate paragraph in the final email.</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        <div style={{ flex: 1 }} />
        <button onClick={onSaveDraft} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t1, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save draft</button>
        <button onClick={onNext} style={{ padding: '10px 24px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Siguiente &rarr;</button>
      </div>
    </div>
  )
}
