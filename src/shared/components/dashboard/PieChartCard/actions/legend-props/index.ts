import type { Datum } from '@/shared/components/dashboard/PieChartCard/types'

function legendProps({ name, value }: Datum, labelOf: (name: string) => string, total: number, colors: Record<string, string>, formatValue: ((v: number) => string) | undefined) {
  const props = {
    name: labelOf(name),
    value,
    total,
    color: colors[name],
    formatValue,
  }
  return props
}

export default legendProps

// The module builds LegendItem props for PieChartCard.
