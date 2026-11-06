import type { ChangeEvent } from 'react'
import type { PopoverFields } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/popover-fields/types'
import resolveDescribedByIds from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/described-by'

type EndField = PopoverFields['endField']

function identity({ id, disabled, error }: EndField) {
  const attributes = { id, disabled, 'aria-invalid': error ? true : undefined }

  return attributes
}

function description({ id, label, error }: EndField) {
  const describedByInput = { id, error }
  const { describedBy } = resolveDescribedByIds(describedByInput)
  const attributes = { 'aria-label': label, 'aria-describedby': describedBy }

  return attributes
}

function selection({ value, onChange }: EndField) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)
  const attributes = { value, onChange: handleChange }

  return attributes
}

/** Keeps end-time selection, identity and validation semantics in one native select contract. */
export default function selectAttributes(props: EndField) {
  const attributes = { ...identity(props), ...description(props), ...selection(props) }

  return attributes
}

// The select shares RangeField's described-by ids without changing its native input contract.
