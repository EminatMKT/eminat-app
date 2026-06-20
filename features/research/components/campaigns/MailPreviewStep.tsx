'use client'
import { useResearchTheme } from '../../theme'
import EmailPreview from './EmailPreview'

type Props = {
  campaign: any
  recipientsCount: number
  sending: boolean
  onBack: () => void
  onSaveDraft: () => void
  onSend: () => void
}

export default function MailPreviewStep({ campaign, recipientsCount, sending, onBack, onSaveDraft, onSend }: Props) {
  const { s2, border, t1, t2, t3, accent } = useResearchTheme()
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: s2, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne', color: accent }}>{recipientsCount}</div>
          <div style={{ fontSize: 10, color: t3 }}>Recipients</div>
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: s2, textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaign.asunto || '(no subject)'}</div>
          <div style={{ fontSize: 10, color: t3 }}>Subject</div>
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: s2, textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t1 }}>{campaign.nombre || '(untitled)'}</div>
          <div style={{ fontSize: 10, color: t3 }}>Campaign</div>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: t2, marginBottom: 8 }}>Email preview:</div>
      <EmailPreview contenido={campaign.contenido} size="lg" footer style={{ marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>&larr; Back</button>
        <div style={{ flex: 1 }} />
        <button onClick={onSaveDraft} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t1, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save draft</button>
        <button disabled={sending || recipientsCount === 0} onClick={onSend} style={{ padding: '10px 24px', borderRadius: 10, background: sending || recipientsCount === 0 ? '#9CA3AF' : '#34D399', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: sending || recipientsCount === 0 ? 'not-allowed' : 'pointer' }}>
          {sending ? 'Sending...' : `Send now (${recipientsCount})`}
        </button>
      </div>
    </div>
  )
}
