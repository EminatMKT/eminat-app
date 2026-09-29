import type { Datum } from '@/shared/components/dashboard/PieChartCard/types'
import slices from '@/shared/components/dashboard/PieChartCard/actions/slices'

function cellProps({ name, value }: Datum, colors: Record<string, string>, selected: string | undefined, onSelect: ((value: string) => void) | undefined, className: string) {
  const row = { name, value }
  const props = {
    fill: colors[name],
    fillOpacity: slices.sliceOpacity(row, selected),
    onClick: slices.selectSlice(onSelect, name),
    className: onSelect ? className : undefined,
  }
  return props
}

export default cellProps

// The module builds Recharts Cell props for PieChartCard.
