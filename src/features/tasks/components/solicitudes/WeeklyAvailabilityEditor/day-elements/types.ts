import type { ReactElement } from 'react'
import type { Weekday } from '@/features/tasks/utils/availability'
import type { RangeActionHandler, RangeChangeHandler } from '../component-types'
import type { EditorViewModel } from '../editor-view-model/types'
import type { Translator } from '../types'

/** Everything buildDayElements needs to translate and wire one weekday's DaySection. */
export type DayElementsInput = {
  viewModel: EditorViewModel
  translate: Translator
  onChangeRange: RangeChangeHandler
  onAddRange: (weekday: Weekday) => void
  onRemoveRange: RangeActionHandler
}

/** The seven named day elements WeeklyAvailabilityEditorComposition's props require. */
export type DayElements = {
  monday: ReactElement
  tuesday: ReactElement
  wednesday: ReactElement
  thursday: ReactElement
  friday: ReactElement
  saturday: ReactElement
  sunday: ReactElement
}
