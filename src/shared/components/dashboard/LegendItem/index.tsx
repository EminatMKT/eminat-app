import { DASHBOARD_THEME } from '@/shared/components/dashboard/theme'

// Un renglón de la leyenda, en TRES celdas de la grilla del contenedor (por eso devuelve un
// fragmento y no una caja propia): etiqueta · absoluto · porcentaje.
//
// Ley de continuidad: como los nombres miden distinto, con los tres datos apilados en una sola
// línea las cifras arrancaban en una posición distinta por renglón y el ojo no podía bajar en
// recta para comparar. En columnas, cada cifra queda sobre la anterior y se lee de arriba abajo
// sin releer el nombre. Absoluto y % juntos son el pedido de Federico (12/08/2026).
// Las columnas viven acá, junto al componente que las llena: el contenedor y sus celdas son un
// solo contrato y separarlos deja que uno cambie sin el otro.
export const LEGEND_COLUMNS = 'minmax(0, auto) max-content max-content'

export default function LegendItem({ name, value, total, color }: { name: string; value: number; total: number; color: string }) {
  const { t1, t2, t3 } = DASHBOARD_THEME
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const figure = { fontFamily: 'DM Mono', fontVariantNumeric: 'tabular-nums', textAlign: 'right' } as const
  return (
    <>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: t2, minWidth: 0 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      </span>
      <span style={{ ...figure, fontSize: 12, fontWeight: 700, color: t1 }}>{value}</span>
      <span style={{ ...figure, fontSize: 12, color: t3 }}>{pct}%</span>
    </>
  )
}
