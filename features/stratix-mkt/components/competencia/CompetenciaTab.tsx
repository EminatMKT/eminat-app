'use client'
import { useApp } from '@/shared/context/AppContext'
import { COMPETITORS, EMINAT_DATA } from '../../data'
import { fNum, cardStyle } from './comp-format'
import StratixKpiCard from '../StratixKpiCard'
import CompetitorComparisonBar from './CompetitorComparisonBar'
import CompetitorCard from './CompetitorCard'
import AdvantageRow from './AdvantageRow'

export default function CompetenciaTab() {
  const { s1, s2, border, accent, t1 } = useApp()

  const eminatData = EMINAT_DATA
  // El original ordena `competitors` in-place por IG desc (en el bar chart) y
  // luego renderiza las cards en ese mismo orden. Replicamos ordenando una vez.
  const competitors = [...COMPETITORS].sort((a, b) => b.igFollowers - a.igFollowers)
  const maxIG = Math.max(eminatData.igFollowers, ...COMPETITORS.map(c => c.igFollowers))

  const kpis = [
    {
      label: 'Instagram Position',
      value: '#1',
      valueColor: '#34D399',
      sub: `Eminat: ${fNum(eminatData.igFollowers)} vs top comp: ${fNum(Math.max(...COMPETITORS.map(c => c.igFollowers)))}`,
    },
    {
      label: 'Google Rating',
      value: '⭐'.repeat(Math.round(eminatData.googleRating)),
      valueColor: '#FBB040',
      sub: `${eminatData.googleRating}/5 — ${eminatData.googleReviews} reviews`,
    },
    {
      label: 'Engagement vs Market',
      value: `${eminatData.avgEngagement}%`,
      valueColor: accent,
      sub: `+${(eminatData.avgEngagement - Math.round(COMPETITORS.reduce((s, c) => s + c.igEngagement, 0) / COMPETITORS.length * 10) / 10).toFixed(1)}% above average`,
      subAccent: true,
    },
    {
      label: 'Competitors Tracked',
      value: String(COMPETITORS.length),
      valueColor: t1,
      sub: `${COMPETITORS.filter(c => c.tendencia === 'creciendo').length} growing · ${COMPETITORS.filter(c => c.tendencia === 'bajando').length} declining`,
    },
  ]

  const advantages = [
    { icon: '🏥', title: 'Integrated Ecosystem', desc: 'Medical Center + Research Group + Foundation — no one else offers this' },
    { icon: '📸', title: 'Social Media Leader', desc: `${fNum(eminatData.igFollowers)} combined IG followers, ${eminatData.avgEngagement}% engagement` },
    { icon: '🔬', title: 'Clinical Research', desc: 'Only one with an active clinical research program in the segment' },
    { icon: '🤖', title: 'AI & Technology', desc: 'Ornella AI as a technology differentiator in the market' },
    { icon: '🌎', title: 'Multi-brand', desc: '5+ brands covering medical, aesthetics, research, wellness and social' },
    { icon: '⭐', title: 'Superior Reputation', desc: `${eminatData.googleRating}/5 Google Rating — above market average` },
    { icon: '❤️', title: 'Social Impact', desc: 'VN Foundation — unique social responsibility differentiator' },
  ]

  return (
    <div>
      {/* Market Position Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {kpis.map(k => (
          <StratixKpiCard key={k.label} kpi={k} />
        ))}
      </div>

      {/* Instagram Comparison Bar Chart */}
      <div style={{ ...cardStyle(s1, border), marginBottom: 16 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 16 }}>Instagram Comparison — Miami Followers</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Eminat */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 180, fontSize: 12, fontWeight: 700, color: accent, textAlign: 'right' }}>Eminat (all brands)</div>
            <div style={{ flex: 1, height: 28, borderRadius: 6, background: s2 }}>
              <div style={{ height: '100%', borderRadius: 6, background: `linear-gradient(90deg, ${accent}, #A78BFA)`, width: `${(eminatData.igFollowers / maxIG) * 100}%`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, transition: 'width .5s' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'white' }}>{fNum(eminatData.igFollowers)}</span>
              </div>
            </div>
          </div>
          {competitors.map(c => (
            <CompetitorComparisonBar key={c.name} c={c} maxIG={maxIG} />
          ))}
        </div>
      </div>

      {/* Competitor Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {competitors.map(comp => (
          <CompetitorCard key={comp.name} comp={comp} />
        ))}

        {/* Eminat Advantages Card */}
        <div style={{ ...cardStyle(s1, border), border: `2px solid ${accent}`, background: `${accent}05` }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: accent, marginBottom: 12 }}>Eminat Competitive Advantages</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {advantages.map(v => (
              <AdvantageRow key={v.title} v={v} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
