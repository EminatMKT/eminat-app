'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import createGridActions from './actions'
import gridContext from './grid-context'
import gridView from './grid-view'
import type { AvailabilityWeekGridProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import type { RangeSelection, Select } from './types'

const EMPTY_SELECTION: RangeSelection = { selectedId: null, justCreatedId: null }

/** The grid's one stateful hook: tracks which range is selected and which one was just
 *  created, composes the action handlers, and delegates the rest to gridView. */
export default function useGridController(props: AvailabilityWeekGridProps) {
  const [selection, setSelection] = useState<RangeSelection>(EMPTY_SELECTION)
  const { t } = useT()
  const select: Select = id => setSelection(prev => ({ ...prev, selectedId: id }))
  const markCreated: Select = id => setSelection(prev => ({ ...prev, justCreatedId: id }))
  const actions = createGridActions(gridContext(props, select, markCreated))
  const input = { actions, selection, t }

  return gridView(props, input)
}

// Selection lives here; grid-context/, grid-view/, day-props/, popover-of/, and summary-of/
// each own one pure derivation, keeping every function in this file within its own budget.
