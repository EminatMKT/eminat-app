import type { ReactNode } from 'react'
import { RESEARCH_THEME } from '../theme'
import StatBreakdownRow from './StatBreakdownRow'

// Card de indicador. Se lee en tres golpes, siempre en el mismo orden:
//   1. la barra de color + el rótulo dicen QUÉ métrica es,
//   2. el número (y el % al lado) dicen CUÁNTO,
//   3. el pie explica SOBRE QUÉ está calculado — sin ese renglón un "25%" no significa nada.
// El bloque de abajo se ancla al fondo (marginTop:auto) para que en una fila de cards los pies
// queden todos a la misma altura aunque unas tengan desglose y otras no.
export interface StatBreakdown {
  caption?: string
  rows: { label: string; value: ReactNode }[]
}

export default function StatCard({ label, value, color, size = 'md', badge, footnote, breakdown, showDetail = true }: {
  label: string
  value: ReactNode
  color: string
  size?: 'sm' | 'md'
  badge?: string
  footnote?: string
  breakdown?: StatBreakdown
  // El detalle (pie + desglose) se puede recoger desde afuera. Va por prop y no por estado
  // propio a propósito: si cada card decidiera sola, la fila quedaría dispareja.
  showDetail?: boolean
}) {
  const { s1, border, t1, t2, t3 } = RESEARCH_THEME
  const sm = size === 'sm'
  const eyebrow = { fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.12em', fontFamily: 'DM Mono' } as const
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: sm ? 84 : 104, background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: sm ? '15px 16px 14px' : '18px 18px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      {/* Barra de acento: a distancia se distingue la card por el color antes que por el texto. */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />

      {/* Alto fijo de dos renglones: un rótulo largo ("Contactado (1+ correo)") no puede empujar
          su número más abajo que el de las cards vecinas — en una fila, los números se comparan. */}
      <div style={{ ...eyebrow, lineHeight: 1.35, minHeight: '2.7em', marginBottom: 6 }}>{label}</div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'Syne', fontSize: sm ? 26 : 34, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        {badge && <span style={{ fontFamily: 'DM Mono', fontSize: 10, fontWeight: 700, color, background: `${color}1F`, borderRadius: 999, padding: '3px 8px', lineHeight: 1 }}>{badge}</span>}
      </div>

      {showDetail && (footnote || breakdown) && (
        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
          <div style={{ borderTop: `1px solid ${border}`, opacity: 0.7, marginBottom: 8 }} />
          {footnote && <div style={{ fontSize: 10.5, color: t2, lineHeight: 1.4, marginBottom: breakdown ? 10 : 0 }}>{footnote}</div>}
          {breakdown && (
            <>
              {breakdown.caption && <div style={{ ...eyebrow, marginBottom: 6 }}>{breakdown.caption}</div>}
              {breakdown.rows.map(r => <StatBreakdownRow key={r.label} label={r.label} value={r.value} />)}
            </>
          )}
        </div>
      )}
    </div>
  )
}
