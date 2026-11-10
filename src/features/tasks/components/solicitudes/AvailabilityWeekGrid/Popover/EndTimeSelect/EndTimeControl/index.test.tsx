import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'
import { END_OF_DAY_TIME } from '@/features/tasks/utils/availability/constants'
import { END_FIELD_ID } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/constants'
import EndTimeControl from './index'

const END_LABEL = 'End'
const FIELD: RangeFieldProps = {
  id: END_FIELD_ID,
  inputType: 'time',
  label: END_LABEL,
  value: END_OF_DAY_TIME,
  onChange: () => undefined,
}

describe('EndTimeControl', () => {
  it('offers every half-hour through midnight after a disabled placeholder', () => {
    const html = renderToStaticMarkup(<EndTimeControl {...FIELD} />)
    const optionCount = html.match(/<option\b/g)?.length

    expect(optionCount).toBe(50)
    expect(html).toMatch(/<option value="" disabled="">/)
  })
})
