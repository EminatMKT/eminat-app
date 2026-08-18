'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts'
import { RESEARCH_THEME } from '../theme'
import { CHART_COLORS } from '../constants'
import Panel from './Panel'

// `key` es el VALOR con el que se filtra al clickear (la etiqueta puede estar traducida);
// si no viene, se filtra por el nombre — sirve para las gráficas cuyo nombre YA es el valor
// canónico (fase, etapa).
type Datum = { name: string; value: number; key?: string }

// Card con BarChart coloreado. vertical=true → barras horizontales (Top Sponsors);
// default → barras verticales (Leads by Phase).
// La cifra va SOBRE la barra y el eje de valores desaparece: proyectado, nadie sigue una barra
// hasta una escala lateral. Misma razón que el % dentro del pie.
// ⚠️ isAnimationActive={false} es necesario para que se vean las etiquetas (ver StagePieChart).
// `onSelect` convierte la gráfica en un filtro: clic en una barra filtra el tablero por ese
// valor, clic en la misma barra lo saca (lo resuelve el caller comparando con `selected`).
// La barra activa se distingue atenuando las otras, no coloreándola distinto: el color ya
// codifica la categoría y pisarlo haría perder la lectura.
export default function BarChartCard({ title, data, vertical = false, height, persistKey, onSelect, selected }: { title: string; data: Datum[]; vertical?: boolean; height?: number; persistKey: string; onSelect?: (value: string) => void; selected?: string }) {
  const { s1, border, t1, t2 } = RESEARCH_THEME
  const tooltipStyle = { background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }
  const figure = { fontFamily: 'Syne', fontSize: 13, fontWeight: 800 }
  const valueOf = (d: Datum) => d.key ?? d.name
  const dim = (d: Datum) => (selected && valueOf(d) !== selected ? 0.28 : 1)
  const barProps = onSelect
    ? { onClick: (d: any) => onSelect(valueOf(d?.payload ?? d)), style: { cursor: 'pointer' } }
    : {}
  return (
    <Panel collapsible persistKey={persistKey} title={title}>
      <ResponsiveContainer width="100%" height={height ?? (vertical ? 200 : 220)}>
        {vertical ? (
          <BarChart data={data} layout="vertical" margin={{ right: 28 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: t2 }} width={120} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: `${t2}12` }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false} {...barProps}>
              {data.map((d, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={dim(d)} />)}
              <LabelList dataKey="value" position="right" fill={t1} style={figure} />
            </Bar>
          </BarChart>
        ) : (
          <BarChart data={data} margin={{ top: 22 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: t2 }} axisLine={{ stroke: border }} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: `${t2}12` }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false} {...barProps}>
              {data.map((d, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={dim(d)} />)}
              <LabelList dataKey="value" position="top" fill={t1} style={figure} />
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </Panel>
  )
}
