'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import createGridActions from './actions'
import gridContext from './grid-context'
import gridView from './grid-view'
import type { AvailabilityWeekGridProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'

/** The grid's one stateful hook: tracks which range is selected, composes the action handlers,
 *  and delegates the per-day props, popover, and weekly summary to gridView. */
export default function useGridController(props: AvailabilityWeekGridProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { t } = useT()
  const actions = createGridActions(gridContext(props, setSelectedId))
  const input = { actions, selectedId, t }

  return gridView(props, input)
}

// Selection lives here; grid-context/, grid-view/, day-props/, popover-of/, and summary-of/
// each own one pure derivation, keeping every function in this file within its own budget.
