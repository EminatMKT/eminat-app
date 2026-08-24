'use client'
import type { ReactNode } from 'react'
import { DASHBOARD_THEME } from '@/shared/components/dashboard/theme'
import { useT } from '@/shared/i18n'
import { useUserPreference } from '@/shared/hooks/useUserPreference'
import StatBreakdownRow from '@/shared/components/dashboard/StatBreakdownRow'

// Card de indicador. Se lee en dos golpes: la barra de color + el rótulo dicen QUÉ métrica es,
// y el número (con su % al lado) dice CUÁNTO.
//
// El detalle es opcional y se recoge EN LA PROPIA CARD, no desde la sección: casi ninguna cifra
// necesita explicación abajo, y la única que sí (el desglose de cadencia bajo "Correos enviados")
// no tiene por qué arrastrar a las demás. Con `detailKey`, cada card recuerda cómo la dejaron.
export interface StatBreakdown {
  caption?: string
  rows: { label: string; value: ReactNode }[]
}

export default function StatCard({ label, value, color, size = 'md', badge, badgeNeutral = false, footnote, breakdown, detailKey }: {
  label: string
  value: ReactNode
  color: string
  size?: 'sm' | 'md'
  badge?: string
  badgeNeutral?: boolean // el badge no es una proporción (ej. un mes): sin el color de la métrica
  footnote?: string
  breakdown?: StatBreakdown
  detailKey?: string // sin esto el detalle va siempre visible (no hay nada que recordar)
}) {
  const { s1, border, t1, t2, t3 } = DASHBOARD_THEME
  const { t } = useT()
  const sm = size === 'sm'
  const eyebrow = { fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.12em', fontFamily: 'DM Mono' } as const
  const hasDetail = !!(footnote || breakdown)
  const [open, setOpen] = useUserPreference(detailKey ? `stat-${detailKey}` : null, true)
  const showDetail = hasDetail && (!detailKey || open)
  const detailId = detailKey ? `stat-detail-${detailKey}` : undefined
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: sm ? 84 : 104, background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: sm ? '15px 16px 14px' : '18px 18px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      {/* Barra de acento: a distancia se distingue la card por el color antes que por el texto. */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />

      {/* Alto fijo de dos renglones: un rótulo largo ("Contactado (1+ correo)") no puede empujar
          su número más abajo que el de las cards vecinas — en una fila, los números se comparan. */}
      <div style={{ ...eyebrow, lineHeight: 1.35, minHeight: '2.7em', marginBottom: 6 }}>{label}</div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'Syne', fontSize: sm ? 26 : 34, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        {badge && <span style={{ fontFamily: 'DM Mono', fontSize: 10, fontWeight: 700, color: badgeNeutral ? t2 : color, background: badgeNeutral ? `${t3}22` : `${color}1F`, borderRadius: 999, padding: '3px 8px', lineHeight: 1 }}>{badge}</span>}
      </div>

      {/* El control queda ANCLADO acá, entre el número y el detalle: lo que crece al desplegar es
          lo de abajo, no él. Si se moviera al pie del detalle, el segundo clic caería en otro
          lado del que quedó el cursor. Mismo chevron que la cabecera de un Panel: ▼ abierto,
          girado 90° al recoger — el gesto del módulo para "esto se despliega". */}
      {hasDetail && detailKey && (
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={detailId}
          aria-label={`${t(open ? 'research.section.hideDetail' : 'research.section.showDetail')}: ${label}`}
          style={{ alignSelf: 'flex-start', marginTop: 12, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, cursor: 'pointer', border: '1px solid #D1D5DB', background: 'transparent', color: t2, fontSize: 8, lineHeight: 1 }}>
          <span style={{ display: 'inline-block', transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .15s ease' }}>▼</span>
        </button>
      )}

      {showDetail && (
        <div id={detailId} style={{ paddingTop: 12 }}>
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
