import type { PieLabelRenderProps } from 'recharts'
import type { Datum } from '@/shared/components/dashboard/PieChartCard/types'
import percentText from '@/shared/components/dashboard/PieChartCard/actions/percent-text'
import INNER_RADIUS from '@/shared/components/dashboard/PieChartCard/constants/inner-radius'
import OUTER_RADIUS from '@/shared/components/dashboard/PieChartCard/constants/outer-radius'
import RAD from '@/shared/components/dashboard/PieChartCard/constants/rad'

function percentLabel(data: Datum[], donut: boolean, total: number, className: string) {
  return function renderPercent({
    cx: centerX,
    cy: centerY,
    midAngle,
    innerRadius,
    outerRadius,
    index,
  }: PieLabelRenderProps) {
    if (donut) return null
    const row = data[Number(index)]
    const value = row ? row.value : 0
    if (!total || value / total < 0.05) return null
    const radius = (Number(innerRadius) + Number(outerRadius)) / 2
    const x = Number(centerX) + radius * Math.cos(-Number(midAngle) * RAD)
    const vertical = Number(centerY) + radius * Math.sin(-Number(midAngle) * RAD)
    const percent = Math.round((value / total) * 100)
    return percentText(x, vertical, percent, className)
  }
}

function pieProps(data: Datum[], donut: boolean, total: number, className: string) {
  let innerRadius: string | number = 0
  if (donut) innerRadius = INNER_RADIUS
  const props = {
    data,
    cx: '50%',
    cy: '50%',
    innerRadius,
    outerRadius: OUTER_RADIUS,
    paddingAngle: 0,
    stroke: 'none',
    dataKey: 'value',
    labelLine: false,
    label: percentLabel(data, donut, total, className),
    isAnimationActive: false,
  }
  return props
}

export default pieProps

// The module builds Recharts pie props for PieChartCard.
