'use client'
import { useApp } from '@/shared/context/AppContext'
import { fNum, cardStyle, badgeStyle } from './comp-format'
import { TENDENCIA_COLORS, TENDENCIA_ICONS } from '../../data'
import type { Competitor } from '../../data'

export default function CompetitorCard({ comp }: { comp: Competitor }) {
  const { s1, s2, border, accent, t1, t2, t3 } = useApp()
  return (
    <div style={{ ...cardStyle(s1, border), position: 'relative' }}>
      <div style={{ position: 'absolute', top: 14, right: 14 }}>
        <span style={badgeStyle(TENDENCIA_COLORS[comp.tendencia])}>{TENDENCIA_ICONS[comp.tendencia]} {comp.tendencia}</span>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: t1, marginBottom: 2 }}>{comp.name}</div>
        <div style={{ fontSize: 11, color: t3 }}>{comp.tipo} · {comp.ubicacion}</div>
        <div style={{ fontSize: 10, color: accent, fontFamily: 'DM Mono', marginTop: 2 }}>{comp.website}</div>
      </div>

      {/* Social Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        <div style={{ padding: '8px', borderRadius: 8, background: s2, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: t3, marginBottom: 2 }}>📸 Instagram</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{fNum(comp.igFollowers)}</div>
          <div style={{ fontSize: 9, color: '#34D399' }}>{comp.igEngagement}% eng</div>
        </div>
        <div style={{ padding: '8px', borderRadius: 8, background: s2, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: t3, marginBottom: 2 }}>👤 Facebook</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{fNum(comp.fbFollowers)}</div>
        </div>
        <div style={{ padding: '8px', borderRadius: 8, background: s2, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: t3, marginBottom: 2 }}>🎵 TikTok</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{comp.tkFollowers > 0 ? fNum(comp.tkFollowers) : '—'}</div>
        </div>
      </div>

      {/* Google Rating */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '6px 10px', borderRadius: 8, background: s2 }}>
        <span style={{ fontSize: 11 }}>⭐</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: comp.googleRating >= 4.5 ? '#34D399' : comp.googleRating >= 4 ? '#FBB040' : '#F87171' }}>{comp.googleRating}</span>
        <span style={{ fontSize: 10, color: t3 }}>({comp.googleReviews} reviews)</span>
        <span style={{ fontSize: 10, color: t3 }}>· {comp.precioRango}</span>
      </div>

      {/* Services */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Services</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {comp.servicios.map(s => <span key={s} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: s2, color: t2 }}>{s}</span>)}
        </div>
      </div>

      {/* Strengths and Weaknesses */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: '#34D399', fontWeight: 600, marginBottom: 4 }}>Strengths</div>
          {comp.fortalezas.map(f => <div key={f} style={{ fontSize: 10, color: t2, padding: '2px 0', display: 'flex', gap: 4 }}><span style={{ color: '#34D399' }}>+</span> {f}</div>)}
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#F87171', fontWeight: 600, marginBottom: 4 }}>Weaknesses</div>
          {comp.debilidades.map(d => <div key={d} style={{ fontSize: 10, color: t2, padding: '2px 0', display: 'flex', gap: 4 }}><span style={{ color: '#F87171' }}>-</span> {d}</div>)}
        </div>
      </div>
    </div>
  )
}
