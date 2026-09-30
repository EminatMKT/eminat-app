import cellProps from './cell-props'
import labels from './labels'
import legendProps from './legend-props'
import pieProps from './pie-props'
import slices from './slices'

const actions = {
  ...labels,
  ...slices,
  cellProps,
  legendProps,
  pieProps,
}

export default actions

// The module exposes the PieChartCard view-action API consumed by the component.
