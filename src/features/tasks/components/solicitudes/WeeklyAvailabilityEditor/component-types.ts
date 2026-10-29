import type { RangeValidationError, Weekday, WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { EditorDay, RangeField } from './types'
import type { EditorStatus } from './types'

export type EditableRange = WeeklyAvailabilityRange & {
  clientId: string
}

export type RangeChangeHandler = (clientId: string, field: RangeField, value: string) => void

export type RangeActionHandler = (clientId: string) => void

export type LocalEditorState = {
  ranges: EditableRange[]
  status: EditorStatus
  message: string | null
  pendingRemoval: EditableRange | null
}

export type DaySectionProps = {
  day: EditorDay
  label: string
  ranges: EditableRange[]
  expectedHours: number | null
  errors: RangeValidationError[]
  onChangeRange: RangeChangeHandler
  onAddRange: (weekday: Weekday) => void
  onRemoveRange: RangeActionHandler
}

export type RangeRowProps = {
  range: EditableRange
  number: number
  dayLabel: string
  errors: RangeValidationError[]
  onChange: RangeChangeHandler
  onRemove: RangeActionHandler
}
