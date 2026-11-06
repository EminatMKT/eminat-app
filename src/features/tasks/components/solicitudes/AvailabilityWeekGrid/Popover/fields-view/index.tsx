import RangeField from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField'
import EndTimeSelect from '../EndTimeSelect'
import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'
import type { PopoverFields } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/popover-fields/types'
import s from './index.module.css'

function timeRow(startField: RangeFieldProps, endField: RangeFieldProps) {
  return <div className={s.timeRow}>
    <div className={s.field}><RangeField {...startField} /></div>
    <div className={s.field}><EndTimeSelect {...endField} /></div>
  </div>
}

/** Shows the start and note fields around the end-time selector. */
export default function renderFields(fields: PopoverFields) {
  const { startField, endField, noteField } = fields

  return <>
    {timeRow(startField, endField)}
    <div className={s.field}><RangeField {...noteField} /></div>
  </>
}

// Split out of Popover/index.tsx so that file never needs to import both RangeField and
// EDITOR_COPY — two separate files under WeeklyAvailabilityEditor/, which trips this repo's
// one-import-per-directory rule.
