'use client'
import { RESEARCH_THEME } from '../../theme'

type Props = {
  campaign: any
  recipientsCount: number
  sending: boolean
  onBack: () => void
  onSaveDraft: () => void
  onSend: () => void
}

export default function MailPreviewStep({ campaign, recipientsCount, sending, onBack, onSaveDraft, onSend }: Props) {
  const { s2, border, t1, t2, t3, accent } = RESEARCH_THEME
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
      <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ background: '#4F46E5', padding: '18px 24px', textAlign: 'center' }}>
          <div style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>Eminat Research Group</div>
        </div>
        <div style={{ padding: '24px', background: '#FFFFFF' }}>
          {campaign.contenido ? campaign.contenido.split('\n').map((p: string, i: number) => (
            <p key={i} style={{ color: '#374151', fontSize: 14, lineHeight: 1.7, margin: '0 0 12px' }}>{p}</p>
          )) : <p style={{ color: '#9CA3AF', fontSize: 14 }}>(no content)</p>}
        </div>
        <div style={{ padding: '14px 24px', background: '#F9FAFB', textAlign: 'center', fontSize: 10, color: '#9CA3AF', borderTop: `1px solid ${border}` }}>
          Eminat Research Group — Clinical Research Operations
        </div>
      </div>
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
