'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { COMPETITORS, EMINAT_DATA } from '@/features/stratix-mkt/data'
import { fNum } from '@/features/stratix-mkt/utils/comp-format'
import StatCard from '@/shared/components/dashboard/StatCard'
import Panel from '@/shared/components/dashboard/Panel'
import CompetitorComparisonBar from '../CompetitorComparisonBar'
import CompetitorCard from '../CompetitorCard'
import AdvantageRow from '../AdvantageRow'
import ComparisonBar from '../ComparisonBar'
import s from './index.module.css'

export default function CompetenciaTab() {
  const { accent, t1 } = useApp()
  const { t } = useT()

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
      <div className={s.kpis}>
        {kpis.map(k => (
          <StatCard key={k.label} size="sm" label={k.label} value={k.value} color={k.valueColor}
            badge={k.subAccent ? String(k.sub) : undefined} footnote={k.subAccent ? undefined : String(k.sub)} />
        ))}
      </div>

      <div className={s.comparacion}>
        <Panel title={t('stratix.comp.igComparison')}>
          <div className={s.barras}>
          <ComparisonBar propia nombre={t('stratix.comp.eminatAll')} pct={(eminatData.igFollowers / maxIG) * 100}
            valor={fNum(eminatData.igFollowers)} relleno={`linear-gradient(90deg, ${accent}, #A78BFA)`} />
            {competitors.map(c => (
              <CompetitorComparisonBar key={c.name} c={c} maxIG={maxIG} />
            ))}
          </div>
        </Panel>
      </div>

      <div className={s.fichas}>
        {competitors.map(comp => (
          <CompetitorCard key={comp.name} comp={comp} />
        ))}

        <div className={`${s.card} ${s.ventajas}`}>
          <div className={s.tituloVentajas}>{t('stratix.comp.advantages')}</div>
          <div className={s.lista}>
            {advantages.map(v => (
              <AdvantageRow key={v.title} v={v} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
