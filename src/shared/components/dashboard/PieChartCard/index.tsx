'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, type PieLabelRenderProps } from 'recharts'
import { DASHBOARD_THEME } from '@/shared/components/dashboard/theme'
import LegendItem, { LEGEND_COLUMNS } from '@/shared/components/dashboard/LegendItem'
import Panel from '@/shared/components/dashboard/Panel'
import ChartFilterHint from '@/shared/components/dashboard/ChartFilterHint'

const RAD = Math.PI / 180

// `onSelect` hace del pie un filtro: clic en una porción filtra el tablero por ese valor
// (mismo gesto que las barras). El nombre de la porción ES el valor por el que se filtra, así
// que se pasa tal cual. La porción activa se marca atenuando las otras.
//
// `colors` llega resuelto DE UNA VEZ para todo el gráfico —el Cell y su renglón de leyenda leen
// el mismo mapa— porque quien conoce el dominio es quien puede garantizar que dos valores
// distintos no compartan color (en Research lo hace `stageColors`). `labelOf` traduce el valor
// crudo a lo que se muestra; por defecto se muestra tal cual.
export default function PieChartCard({ title, persistKey, data, colors, labelOf = n => n, onSelect, selected }: {
  title: string
  persistKey: string
  data: { name: string; value: number }[]
  colors: Record<string, string>
  labelOf?: (name: string) => string
  onSelect?: (value: string) => void
  selected?: string
}) {
  const { s1, border } = DASHBOARD_THEME
  const total = data.reduce((sum, d) => sum + d.value, 0)

  // Porcentaje DENTRO de la porción (pedido de Federico, 12/08/2026: el dashboard se proyecta en
  // la sala de conferencias y hoy no se lee de lejos). El % se calcula del propio `data` por
  // índice, no del `percent` que pasa recharts — así no depende de qué trae el render prop.
  // Las porciones de menos de 5% van sin texto: no entra y se pisa con las vecinas.
  const percentLabel = ({ cx, cy, midAngle, outerRadius, index }: PieLabelRenderProps) => {
    const value = data[Number(index)]?.value ?? 0
    if (!total || value / total < 0.05) return null
    const r = Number(outerRadius) * 0.6
    const x = Number(cx) + r * Math.cos(-Number(midAngle) * RAD)
    const y = Number(cy) + r * Math.sin(-Number(midAngle) * RAD)
    return (
      <text x={x} y={y} fill="#FFFFFF" textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800 }}>
        {Math.round((value / total) * 100)}%
      </text>
    )
  }
  return (
    <Panel collapsible persistKey={persistKey} title={title}
      right={onSelect ? <ChartFilterHint label={selected ? labelOf(selected) : undefined} onClear={() => selected && onSelect(selected)} /> : undefined}>
      {/* Leyenda a la derecha y no debajo: mismo pedido de legibilidad a distancia. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: '1 1 55%', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height={220}>
            {/* Relleno, no dona (innerRadius 0): la porción se ve entera desde el fondo de la sala.
                Sin paddingAngle: el hueco no era cosmético, le comía ángulo a cada porción y en
                un pie el ángulo ES el dato — un 25% separado se lee como menos de un cuarto. Un
                pie muestra partes de un TODO y así vuelve a verse entero. `stroke="none"` es
                aparte y es decisión del usuario (nada de líneas blancas): el costo es que dos
                colores vecinos parecidos se funden; si molesta, un stroke de 1px NO cuesta
                ángulo.
                ⚠️ `isAnimationActive={false}` NO es cosmético: recharts 3 renderiza las etiquetas
                con `showLabels: !isAnimating` (es6/polar/Pie.js), y acá el fin de la animación no
                destapa el flag → con la animación puesta el % no aparece nunca. */}
            <PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={0} outerRadius={95} paddingAngle={0} stroke="none" dataKey="value" labelLine={false} label={percentLabel} isAnimationActive={false}>
              {data.map(d => <Cell key={d.name} fill={colors[d.name]} fillOpacity={selected && d.name !== selected ? 0.28 : 1}
                onClick={onSelect ? () => onSelect(d.name) : undefined} style={onSelect ? { cursor: 'pointer' } : undefined} />)}
            </Pie><Tooltip formatter={(value, name) => [value, labelOf(String(name))]} contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /></PieChart>
          </ResponsiveContainer>
        </div>
        {/* Grilla de 3 columnas: los nombres miden distinto, así que solo alineando las cifras
            en columna el ojo puede bajar en recta y compararlas (ley de continuidad).
            `0 1 auto` + minWidth 0: la leyenda cede ancho antes que dejar sin espacio al pie —
            un nombre largo ('Discovery/Feasibility') llegaba a recortar el gráfico en pantallas
            de ~1024px. Lo que se achica es el nombre (con elipsis), nunca las cifras. */}
        <div style={{ flex: '0 1 auto', minWidth: 0, display: 'grid', gridTemplateColumns: LEGEND_COLUMNS, columnGap: 12, rowGap: 9, alignItems: 'baseline' }}>
          {data.map(d => <LegendItem key={d.name} name={labelOf(d.name)} value={d.value} total={total} color={colors[d.name]} />)}
        </div>
      </div>
    </Panel>
  )
}
