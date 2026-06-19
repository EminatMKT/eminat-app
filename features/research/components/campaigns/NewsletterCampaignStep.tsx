'use client'
import { RESEARCH_THEME, inputStyle } from '../../theme'

type Campaign = { subject: string; content: string; type: string }
type Props = {
  campaign: Campaign
  setCampaign: (fn: (p: Campaign) => Campaign) => void
  onBack: () => void
  onNext: () => void
}

export default function NewsletterCampaignStep({ campaign, setCampaign, onBack, onNext }: Props) {
  const { s1, border, t2, t3, accent } = RESEARCH_THEME
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ marginBottom: 14 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Subject</label><input value={campaign.subject} onChange={e => setCampaign(p => ({ ...p, subject: e.target.value }))} style={inputStyle} placeholder="Campaign subject" /></div>
      <div style={{ marginBottom: 14 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Type</label>
        <select value={campaign.type} onChange={e => setCampaign(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
          <option value="Email">Email</option><option value="Reunión">Meeting</option><option value="Llamada">Call</option>
        </select>
      </div>
      <div style={{ marginBottom: 14 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Content</label><textarea value={campaign.content} onChange={e => setCampaign(p => ({ ...p, content: e.target.value }))} style={{ ...inputStyle, minHeight: 140, resize: 'vertical' }} placeholder="Write the content..." /></div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>← Back</button>
        <button onClick={onNext} style={{ padding: '10px 24px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Next →</button>
      </div>
    </div>
  )
}
