'use client'
import { RESEARCH_THEME } from '../theme'
import { MAIL_ESTADO_COLOR } from '../constants'
import { useResearch } from './ResearchContext'
import type { Campaign } from '../types'

export default function MailCampaignRow({ campaign: c }: { campaign: Campaign }) {
  const { border, t1, t2, t3, accent } = RESEARCH_THEME
  const { setMailViewCampaign, openMailModal, duplicateCampaign, deleteCampaign } = useResearch()
  return (
    <tr style={{ borderBottom: `1px solid ${border}` }}>
      <td style={{ padding: '10px 14px', color: t1, fontWeight: 600 }}>{c.nombre || '(untitled)'}</td>
      <td style={{ padding: '10px 14px', color: t2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.asunto || '—'}</td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: `${MAIL_ESTADO_COLOR[c.estado || ''] || t3}15`, color: MAIL_ESTADO_COLOR[c.estado || ''] || t3, fontWeight: 600 }}>{c.estado}</span>
      </td>
      <td style={{ padding: '10px 14px', color: t2, fontFamily: 'DM Mono', fontSize: 11 }}>{c.total_enviados || 0}</td>
      <td style={{ padding: '10px 14px', color: t2, fontFamily: 'DM Mono', fontSize: 11 }}>
        {c.total_abiertos || 0}
        {(c.total_enviados || 0) > 0 && <span style={{ color: t3, marginLeft: 4 }}>({Math.round((c.total_abiertos || 0) / (c.total_enviados || 1) * 100)}%)</span>}
      </td>
      <td style={{ padding: '10px 14px', color: t3, fontSize: 10, fontFamily: 'DM Mono' }}>
        {c.fecha_envio ? new Date(c.fecha_envio).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : '—'}
      </td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => setMailViewCampaign(c)} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, cursor: 'pointer' }}>View</button>
          {c.estado === 'Borrador' && <button onClick={() => openMailModal(c, 0)} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, border: '1px solid rgba(124,111,247,.3)', background: 'transparent', color: accent, cursor: 'pointer' }}>Edit</button>}
          <button onClick={() => duplicateCampaign(c)} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, border: '1px solid rgba(96,165,250,.3)', background: 'transparent', color: '#60A5FA', cursor: 'pointer' }}>Duplicate</button>
          {c.estado !== 'Enviado' && <button onClick={() => deleteCampaign(c.id)} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, border: '1px solid rgba(248,113,113,.3)', background: 'transparent', color: '#F87171', cursor: 'pointer' }}>Delete</button>}
          {c.estado === 'Borrador' && <button onClick={() => openMailModal(c, 1)} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, border: '1px solid rgba(52,211,153,.3)', background: 'transparent', color: '#34D399', cursor: 'pointer', fontWeight: 600 }}>Send</button>}
        </div>
      </td>
    </tr>
  )
}
