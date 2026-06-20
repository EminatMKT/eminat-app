'use client'
import { useApp } from '@/shared/context/AppContext'
import { fNum, badgeStyle } from './comp-format'
import { TENDENCIA_COLORS, TENDENCIA_ICONS } from '../../data'
import type { Competitor } from '../../data'

export default function CompetitorComparisonBar({ c, maxIG }: { c: Competitor; maxIG: number }) {
  const { s2, t2 } = useApp()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 180, fontSize: 11, color: t2, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
      <div style={{ flex: 1, height: 22, borderRadius: 6, background: s2 }}>
        <div style={{ height: '100%', borderRadius: 6, background: TENDENCIA_COLORS[c.tendencia], opacity: 0.6, width: `${(c.igFollowers / maxIG) * 100}%`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, transition: 'width .5s' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'white' }}>{fNum(c.igFollowers)}</span>
        </div>
      </div>
      <span style={badgeStyle(TENDENCIA_COLORS[c.tendencia])}>{TENDENCIA_ICONS[c.tendencia]} {c.tendencia}</span>
    </div>
  )
}
