'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts'
import { RESEARCH_THEME } from '../theme'
import { CHART_COLORS } from '../constants'
import Panel from './Panel'

type Datum = { name: string; value: number }

// Card con BarChart coloreado. vertical=true → barras horizontales (Top Sponsors);
// default → barras verticales (Leads by Phase).
// La cifra va SOBRE la barra y el eje de valores desaparece: proyectado, nadie sigue una barra
// hasta una escala lateral. Misma razón que el % dentro del pie.
// ⚠️ isAnimationActive={false} es necesario para que se vean las etiquetas (ver StagePieChart).
export default function BarChartCard({ title, data, vertical = false, height, yWidth = 120 }: { title: string; data: Datum[]; vertical?: boolean; height?: number; yWidth?: number }) {
  const { s1, border, t1, t2 } = RESEARCH_THEME
  const tooltipStyle = { background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }
  const figure = { fontFamily: 'Syne', fontSize: 13, fontWeight: 800 }
  return (
    <Panel title={title}>
      <ResponsiveContainer width="100%" height={height ?? (vertical ? 200 : 220)}>
        {vertical ? (
          <BarChart data={data} layout="vertical" margin={{ right: 28 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: t2 }} width={yWidth} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: `${t2}12` }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              <LabelList dataKey="value" position="right" fill={t1} style={figure} />
            </Bar>
          </BarChart>
        ) : (
          <BarChart data={data} margin={{ top: 22 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: t2 }} axisLine={{ stroke: border }} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: `${t2}12` }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              <LabelList dataKey="value" position="top" fill={t1} style={figure} />
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </Panel>
  )
}
