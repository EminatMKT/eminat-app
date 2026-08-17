'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, type PieLabelRenderProps } from 'recharts'
import { RESEARCH_THEME } from '../theme'
import { stageLabel, stageColors } from '../constants'
import { useT } from '@/shared/i18n'
import StageLegendItem from './StageLegendItem'
import Panel from './Panel'

const RAD = Math.PI / 180

export default function StagePieChart({ data }: { data: { name: string; value: number }[] }) {
  const { s1, border } = RESEARCH_THEME
  const { t } = useT()
  const total = data.reduce((sum, d) => sum + d.value, 0)
  // Una sola resolución para todo el gráfico: el Cell y su renglón de leyenda leen el mismo mapa.
  const colors = stageColors(data.map(d => d.name))

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
    <Panel collapsible persistKey="research-pipeline" title={t('research.chart.pipelineByStage')}>
      {/* Leyenda a la derecha y no debajo: mismo pedido de legibilidad a distancia. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: '1 1 55%', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height={220}>
            {/* Relleno, no dona (innerRadius 0): la porción se ve entera desde el fondo de la sala.
                ⚠️ `isAnimationActive={false}` NO es cosmético: recharts 3 renderiza las etiquetas
                con `showLabels: !isAnimating` (es6/polar/Pie.js), y acá el fin de la animación no
                destapa el flag → con la animación puesta el % no aparece nunca. */}
            <PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={0} outerRadius={95} paddingAngle={2} dataKey="value" labelLine={false} label={percentLabel} isAnimationActive={false}>
              {data.map(d => <Cell key={d.name} fill={colors[d.name]} />)}
            </Pie><Tooltip formatter={(value, name) => [value, stageLabel(String(name), t)]} contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /></PieChart>
          </ResponsiveContainer>
        </div>
        {/* Grilla de 3 columnas: los nombres miden distinto, así que solo alineando las cifras
            en columna el ojo puede bajar en recta y compararlas (ley de continuidad). */}
        <div style={{ flex: '0 0 auto', display: 'grid', gridTemplateColumns: 'auto max-content max-content', columnGap: 12, rowGap: 9, alignItems: 'baseline' }}>
          {data.map(d => <StageLegendItem key={d.name} name={stageLabel(d.name, t)} value={d.value} total={total} color={colors[d.name]} />)}
        </div>
      </div>
    </Panel>
  )
}
