import type { useT } from '@/shared/i18n'
import type { AvailabilityWeekGridProps } from '../types'
import type { GridActions } from './actions/types'

export type Translate = ReturnType<typeof useT>['t']

export type Select = (clientId: string | null) => void

export type GridViewInput = {
  actions: GridActions
  selectedId: string | null
  t: Translate
}

export type PopoverContext = {
  props: AvailabilityWeekGridProps
  actions: GridActions
  t: Translate
}
