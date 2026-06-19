'use client'
import { RESEARCH_THEME } from '../../theme'
import { MAIL_ESTADO_COLOR } from '../../constants'
import { useResearch } from '../ResearchContext'
import CampaignStatBox from './CampaignStatBox'
import EmailPreview from './EmailPreview'

export default function CampaignViewModal() {
  const { s1, border, t1, t3 } = RESEARCH_THEME
  const { mailViewCampaign, setMailViewCampaign } = useResearch()
  if (!mailViewCampaign) return null
  const c = mailViewCampaign
  const stats = [
    { label: 'Status', value: c.estado, color: MAIL_ESTADO_COLOR[c.estado || ''] || t3 },
    { label: 'Sent', value: c.total_enviados || 0, color: '#60A5FA' },
    { label: 'Opened', value: c.total_abiertos || 0, color: '#34D399' },
    { label: 'Clicks', value: c.total_clicks || 0, color: '#F472B6' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setMailViewCampaign(null)}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 600, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>{c.nombre}</div>
          <button onClick={() => setMailViewCampaign(null)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>&#10005;</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {stats.map(k => <CampaignStatBox key={k.label} label={k.label} value={k.value} color={k.color} />)}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: t3, marginBottom: 4 }}>Subject</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t1 }}>{c.asunto}</div>
        </div>
        {c.fecha_envio && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 11, color: t3, marginBottom: 4 }}>Sent date</div><div style={{ fontSize: 13, color: t1 }}>{new Date(c.fecha_envio).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div></div>}
        <div style={{ fontSize: 11, color: t3, marginBottom: 6 }}>Contenido</div>
        <EmailPreview contenido={c.contenido} size="sm" />
      </div>
    </div>
  )
}
