function labelResolver(labelOf: ((name: string) => string) | undefined) {
  if (labelOf) return labelOf
  return (name: string) => name
}

function valueFormatter(formatValue: ((v: number) => string) | undefined) {
  if (formatValue) return formatValue
  return String
}

function selectedLabelFor(selected: string | undefined, labelOf: (name: string) => string) {
  if (!selected) return undefined
  return labelOf(selected)
}

const labels = {
  labelResolver,
  valueFormatter,
  selectedLabelFor,
}

export default labels

// The module owns label and value formatter fallbacks for PieChartCard.
