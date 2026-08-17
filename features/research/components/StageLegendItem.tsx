import { RESEARCH_THEME } from '../theme'

// Absoluto y porcentaje UNO AL LADO DEL OTRO — es el "ideal" que pidió Federico (12/08/2026), y
// deja sin trabajo al selector absolutos/% que planteó como alternativa: no hay nada que alternar
// si los dos valores están siempre a la vista. Tamaño subido para leerse proyectado en la sala.
export default function StageLegendItem({ name, value, total, color }: { name: string; value: number; total: number; color: string }) {
  const { t1, t3 } = RESEARCH_THEME
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
      <span style={{ color: t3 }}>{name}</span>
      <span style={{ color: t1, fontWeight: 700, fontFamily: 'DM Mono' }}>{value}</span>
      <span style={{ color: t3, fontFamily: 'DM Mono' }}>· {pct}%</span>
    </span>
  )
}
