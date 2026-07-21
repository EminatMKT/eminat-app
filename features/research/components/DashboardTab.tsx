'use client'
// import { RESEARCH_THEME } from '../theme' // ponytail: sin uso tras comentar los bloques de dirección — restaurar junto con "Leads by Country"/"Top Sponsors"/"Recently added" (usan s1/border/t1/t3)
import { useResearch } from './ResearchContext'
import StatCard from './StatCard'
// import CountryChip from './CountryChip' // ponytail: oculto por pedido de dirección (reunión 2026-07-20) — restaurar descomentando esto + el bloque "Leads by Country"
// import RecentLeadItem from './RecentLeadItem' // ponytail: oculto por pedido de dirección — restaurar con el bloque "Recently added leads"
import StagePieChart from './StagePieChart'
import BarChartCard from './BarChartCard'
import { useT } from '@/shared/i18n'

export default function DashboardTab() {
  const { t } = useT()
  const { totalLeads, nuevos, contactados, ganados, stageData, phaseData } = useResearch()

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatCard label="Total Leads" value={totalLeads} color="#7C6FF7" />
        <StatCard label={t('research.stage.nuevo')} value={nuevos} color="#60A5FA" />
        <StatCard label={t('research.stage.contactado')} value={contactados} color="#FBB040" />
        <StatCard label={t('research.stage.ganado')} value={ganados} color="#34D399" />
      </div>

      {/* Oculto por dirección (reunión 2026-07-20) — restaurar descomentando + reactivar imports/destructure de countrySorted:
      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Leads by Country</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {countrySorted.map(([country, count]) => <CountryChip key={country} country={country} count={count} />)}
          {countrySorted.length === 0 && <span style={{ color: t3, fontSize: 12 }}>No country data</span>}
        </div>
      </div>
      */}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <StagePieChart data={stageData} />
        <BarChartCard title="Leads by Phase" data={phaseData} />
      </div>

      {/* Oculto por dirección (reunión 2026-07-20) — Top Sponsors + Recently added. Restaurar descomentando + reactivar imports/destructure (sponsorData, leads, RecentLeadItem):
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <BarChartCard title="Top Sponsors" data={sponsorData} vertical />
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, fontSize: 12, fontWeight: 600, color: t1 }}>Recently added leads</div>
          {leads.slice(0, 5).map(l => <RecentLeadItem key={l.id} lead={l} />)}
          {leads.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: t3, fontSize: 12 }}>No leads</div>}
        </div>
      </div>
      */}
    </div>
  )
}
