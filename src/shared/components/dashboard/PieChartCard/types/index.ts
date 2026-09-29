export type Datum = { name: string; value: number }

/** `donut`/`centerLabel` are opt-in for the hollow variant; a filled pie has nowhere to put a
 *  center total. `formatValue` formats the legend's and tooltip's number — as-is by default. */
export type Props = {
  title: string
  persistKey: string
  data: Datum[]
  colors: Record<string, string>
  labelOf?: (name: string) => string
  onSelect?: (value: string) => void
  selected?: string
  donut?: boolean
  centerLabel?: string
  formatValue?: (v: number) => string
}

// PieChartCard's own contract, split out so its `.tsx` doesn't count as a second and third shape.
