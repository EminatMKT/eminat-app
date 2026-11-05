import RangeField from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField'
import type { PopoverFields } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/popover-fields/types'

/** The three RangeFields a Popover shows, in their fixed order: start, end, note. */
export default function renderFields(fields: PopoverFields) {
  const { startField, endField, noteField } = fields

  return <>
    <RangeField {...startField} />
    <RangeField {...endField} />
    <RangeField {...noteField} />
  </>
}

// Split out of Popover/index.tsx so that file never needs to import both RangeField and
// EDITOR_COPY — two separate files under WeeklyAvailabilityEditor/, which trips this repo's
// one-import-per-directory rule.
