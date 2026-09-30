export { default as Panel } from './Panel'
export { default as StatCard } from './StatCard'
export { default as PieChartCard } from './PieChartCard'
export { default as BarChartCard } from './BarChartCard'

// The door to the dashboard's blocks: exports the four pieces already asked for from here. The
// rest of the folder (the two charts' own sub-pieces) still imports module by module until
// something needs them too — a barrel exports what the folder OFFERS, not its whole inventory.
