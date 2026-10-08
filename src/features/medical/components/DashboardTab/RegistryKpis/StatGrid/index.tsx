'use client'
import { StaggerGrid, StaggerItem } from '@/shared/motion'
import { StatCard } from '@/shared/components/dashboard'
import type { Props } from './types'

/** A `StaggerGrid` of `StatCard`s built from a small data array, instead of repeating the
 *  same `<StaggerItem><StatCard /></StaggerItem>` JSX once per stat. */
export default function StatGrid(props: Props) {
  const { className, size, stats } = props
  if (stats.length === 0) return null
  return (
    <StaggerGrid className={className}>
      {stats.map((stat) => (
        <StaggerItem key={stat.label}>
          <StatCard size={size} label={stat.label} value={stat.value} color={stat.color} footnote={stat.footnote} />
        </StaggerItem>
      ))}
    </StaggerGrid>
  )
}
// This caller-owned KPI row builds a small `stats` array once per render and hands it here,
// rather than repeating near-identical `<StaggerItem><StatCard .../></StaggerItem>` JSX by hand.
