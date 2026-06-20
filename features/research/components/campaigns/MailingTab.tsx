'use client'
import { useResearchTheme } from '../../theme'
import { useResearch } from '../ResearchContext'
import StatCard from '../StatCard'
import MailCampaignRow from './MailCampaignRow'

export default function MailingTab() {
  const { s1, s2, border, t1, t3, accent } = useResearchTheme()
  const { campaigns, openMailModal } = useResearch()
  const emailCampaigns = campaigns.filter(c => c.tipo === 'Email' || !c.tipo)
  const totalEnviados = emailCampaigns.filter(c => c.estado === 'Enviado').reduce((s, c) => s + (c.total_enviados || 0), 0)
  const totalAbiertos = emailCampaigns.reduce((s, c) => s + (c.total_abiertos || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Mailing Campaigns</span>
        <button onClick={() => openMailModal(null, 0)} style={{ padding: '7px 16px', borderRadius: 8, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ New campaign</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatCard size="sm" label="Total Campaigns" value={emailCampaigns.length} color={accent} />
        <StatCard size="sm" label="Sent" value={emailCampaigns.filter(c => c.estado === 'Enviado').length} color="#34D399" />
        <StatCard size="sm" label="Drafts" value={emailCampaigns.filter(c => c.estado === 'Borrador').length} color="#FBB040" />
        <StatCard size="sm" label="Emails Sent" value={totalEnviados} color="#60A5FA" />
        <StatCard size="sm" label="Opened" value={totalAbiertos} color="#F472B6" />
      </div>

      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: s2 }}>
            {['Name', 'Subject', 'Status', 'Recipients', 'Opened', 'Date', 'Actions'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>)}
          </tr></thead>
          <tbody>{emailCampaigns.map(c => <MailCampaignRow key={c.id} campaign={c} />)}</tbody>
        </table>
        {emailCampaigns.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3, fontSize: 12 }}>No campaigns — create your first email campaign</div>}
      </div>
    </div>
  )
}
