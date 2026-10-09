'use client'
import { useResearchTheme } from '../../theme'

type Campaign = { subject: string; content: string; type: string }
type Props = {
  campaign: Campaign
  recipientsCount: number
  onBack: () => void
  onSend: () => void
}

export default function NewsletterPreviewStep({ campaign, recipientsCount, onBack, onSend }: Props) {
  const { s1, s2, border, t1, t2, t3, accent } = useResearchTheme()
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: t1, marginBottom: 16 }}>Preview</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div><span style={{ fontSize: 10, color: t3 }}>Type:</span> <span style={{ fontSize: 12, color: t1, fontWeight: 600 }}>{campaign.type}</span></div>
        <div><span style={{ fontSize: 10, color: t3 }}>Recipients:</span> <span style={{ fontSize: 12, color: accent, fontWeight: 600 }}>{recipientsCount}</span></div>
      </div>
      <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Subject</div><div style={{ fontSize: 13, color: t1, fontWeight: 600 }}>{campaign.subject || '(no subject)'}</div></div>
      <div style={{ marginBottom: 14, padding: 14, background: s2, borderRadius: 10 }}><div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Content</div><div style={{ fontSize: 12, color: t2, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{campaign.content || '(no content)'}</div></div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>← Back</button>
        <button onClick={onSend} style={{ padding: '10px 24px', borderRadius: 10, background: '#34D399', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Send campaign ✓</button>
      </div>
    </div>
  )
}
