import RangeField from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField'
import Frame from '../AvailabilityRangeItemFrame'
import type { AvailabilityRangeItemFields } from '../types'

export default function AvailabilityRangeItemControls({
  startField,
  endField,
  noteField,
}: AvailabilityRangeItemFields) {
  return (
    <>
      <Frame part="times"><RangeField {...startField} /><RangeField {...endField} /></Frame>
      <RangeField {...noteField} />
    </>
  )
}

// The three editable fields of one range, so AvailabilityRangeItem only adds its list item and
// the guarded remove action around them.
