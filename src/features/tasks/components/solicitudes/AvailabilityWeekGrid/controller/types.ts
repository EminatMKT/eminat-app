import type { useT } from '@/shared/i18n'
import type { AvailabilityWeekGridProps } from '../types'
import type { GridActions } from './actions/types'

export type Translate = ReturnType<typeof useT>['t']

export type Select = (clientId: string | null) => void

/** Which range is open, and which one was just created unsaved - bundled so popover-of can
 *  derive isNewlyCreated without a third flat parameter. */
export type RangeSelection = {
  selectedId: string | null
  justCreatedId: string | null
}

export type GridViewInput = {
  actions: GridActions
  selection: RangeSelection
  t: Translate
}

export type PopoverContext = {
  props: AvailabilityWeekGridProps
  actions: GridActions
  t: Translate
}
