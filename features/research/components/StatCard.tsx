import { RESEARCH_THEME } from '../theme'

export default function StatCard({ label, value, color, size = 'md', hint }: { label: string; value: React.ReactNode; color: string; size?: 'sm' | 'md'; hint?: string }) {
  const { s1, border, t3 } = RESEARCH_THEME
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: size === 'sm' ? '14px 16px' : '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'DM Mono', marginBottom: 6 }}>{label}</div>
      {/* El hint va al costado del número, un renglón por dato (se parte por '·'): en una sola
          línea el desglose de cadencia se leía como una sopa de números, y debajo empujaba la
          altura de la card. El dato grande manda a la izquierda, el detalle acompaña a la derecha. */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontFamily: 'Syne', fontSize: size === 'sm' ? 24 : 28, fontWeight: 800, color }}>{value}</div>
        {hint && <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', lineHeight: 1.6, textAlign: 'right' }}>
          {hint.split('·').map(line => <div key={line}>{line.trim()}</div>)}
        </div>}
      </div>
    </div>
  )
}
