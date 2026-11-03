import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import type { AvailabilityDay, RangeValidationError, Weekday } from '@/features/tasks/utils/availability'
import type { DaySectionProps, EditableRange, LocalEditorState } from '../component-types'

export type EditorViewModelDay = Pick<DaySectionProps, 'day' | 'ranges' | 'expectedHours' | 'errors'>
export type EditorViewModelSummary = { declaredHours: number }
export type EditorViewModelInput = Pick<LocalEditorState, 'ranges'> & Pick<AvailabilityMemberDto, 'workday'> & { errors: RangeValidationError[] }
export type EditorViewModel = {
  monday: EditorViewModelDay
  tuesday: EditorViewModelDay
  wednesday: EditorViewModelDay
  thursday: EditorViewModelDay
  friday: EditorViewModelDay
  saturday: EditorViewModelDay
  sunday: EditorViewModelDay
  weeklySummary: EditorViewModelSummary
}
export type EditorViewModelDaySource = {
  day: AvailabilityDay
  ranges: EditableRange[]
  errors: RangeValidationError[]
  expectedHours: number | null
  weekday: Weekday
}
