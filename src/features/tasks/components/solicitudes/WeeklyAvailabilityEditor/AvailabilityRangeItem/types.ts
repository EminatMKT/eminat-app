import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { EditableRange } from '../component-types'
import type { RangeFieldProps } from '../RangeField/types'
import type { RangeField } from '../types'
import { AVAILABILITY_RANGE_ITEM_CONSTANTS } from './constants'

export type AvailabilityRangeItemChangeHandler = (
  clientId: string,
  field: RangeField,
  value: string,
) => void

export type AvailabilityRangeItemActionHandler = (clientId: string) => void

export type ConfirmationFunction = (message: string) => boolean

export type AvailabilityRangeItemProps = {
  range: EditableRange
  rangeIndex: number
  number: number
  dayLabel: string
  rangeLabel?: string
  removeLabel?: string
  confirmationMessage?: string
  errors: RangeValidationError[]
  onChange: AvailabilityRangeItemChangeHandler
  onRemove: AvailabilityRangeItemActionHandler
}

export type AvailabilityRangeItemRemoveButton = {
  kind: typeof AVAILABILITY_RANGE_ITEM_CONSTANTS.deleteButtonKind
  iconOnly: boolean
  label: string
  onClick: () => void
}

export type AvailabilityRangeItemViewModel = {
  startField: RangeFieldProps
  endField: RangeFieldProps
  noteField: RangeFieldProps
  removeButton: AvailabilityRangeItemRemoveButton
}

export type AvailabilityRangeItemFields = Pick<AvailabilityRangeItemViewModel, 'startField' | 'endField' | 'noteField'>
