'use client'
import { RESEARCH_THEME } from '../../theme'
import { MAIL_ESTADO_COLOR } from '../../constants'
import { useResearch } from '../ResearchContext'

export default function CampaignViewModal() {
  const { s1, s2, border, t1, t3 } = RESEARCH_THEME
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
          {stats.map(k => (
            <div key={k.label} style={{ padding: '12px', borderRadius: 10, background: s2, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne', color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 10, color: t3 }}>{k.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: t3, marginBottom: 4 }}>Subject</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t1 }}>{c.asunto}</div>
        </div>
        {c.fecha_envio && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 11, color: t3, marginBottom: 4 }}>Sent date</div><div style={{ fontSize: 13, color: t1 }}>{new Date(c.fecha_envio).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div></div>}
        <div style={{ fontSize: 11, color: t3, marginBottom: 6 }}>Contenido</div>
        <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: '#4F46E5', padding: '14px 20px', textAlign: 'center' }}>
            <div style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>Eminat Research Group</div>
          </div>
          <div style={{ padding: '20px', background: '#FFFFFF' }}>
            {c.contenido ? c.contenido.split('\n').map((p: string, i: number) => (
              <p key={i} style={{ color: '#374151', fontSize: 13, lineHeight: 1.7, margin: '0 0 10px' }}>{p}</p>
            )) : <p style={{ color: '#9CA3AF' }}>(no content)</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
