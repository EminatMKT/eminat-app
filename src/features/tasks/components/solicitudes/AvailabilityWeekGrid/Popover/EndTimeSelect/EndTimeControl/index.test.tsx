import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'
import EndTimeControl from './index'

const END_VALUE = '24:00'
const END_LABEL = 'End'
const FIELD: RangeFieldProps = {
  id: 'end-id',
  inputType: 'time',
  label: END_LABEL,
  value: END_VALUE,
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
