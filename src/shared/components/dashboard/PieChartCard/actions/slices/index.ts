import type { Datum } from '@/shared/components/dashboard/PieChartCard/types'

function sliceOpacity({ name }: Datum, selected: string | undefined): number {
  if (selected && name !== selected) return 0.28
  return 1
}

function selectSlice(onSelect: ((value: string) => void) | undefined, name: string) {
  if (!onSelect) return undefined
  return () => onSelect(name)
}

function clearFilter(onSelect: ((value: string) => void) | undefined, selected: string | undefined) {
  if (!onSelect || !selected) return undefined
  return () => onSelect(selected)
}

function hasCenterLabel(donut: boolean, centerLabel: string | undefined) {
  if (!donut) return false
  return Boolean(centerLabel)
}

function hasChartData(length: number, total: number) {
  if (length === 0) return false
  return total > 0
}

const slices = {
  sliceOpacity,
  selectSlice,
  clearFilter,
  hasCenterLabel,
  hasChartData,
}

export default slices

// The module owns click and visibility decisions for PieChartCard slices.
