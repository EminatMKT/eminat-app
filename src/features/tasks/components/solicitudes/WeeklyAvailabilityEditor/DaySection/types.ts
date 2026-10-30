import type { ReactNode } from 'react'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type {
  EditableRange,
  RangeActionHandler,
  RangeChangeHandler,
} from '../component-types'

export type DaySectionRangeContext = {
  label: string
  errors: RangeValidationError[]
  onChangeRange: RangeChangeHandler
  onRemoveRange: RangeActionHandler
}

export type DaySectionRangeItemArgs = {
  range: EditableRange
  rangeIndex: number
  context: DaySectionRangeContext
}

export type DaySectionRanges = EditableRange[]

export type DaySectionRange = EditableRange

export type AddRangeButtonProps = {
  label: string
  onAdd: () => void
}

export type DaySectionContentProps = {
  headingId: string
  label: string
  isEmpty: boolean
  invalidRangeCount: number
  renderedRanges: ReactNode[]
  comparisonText: string
  addButtonProps: AddRangeButtonProps
}
