import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'
import { END_OF_DAY_TIME } from '@/features/tasks/utils/availability/constants'
import { END_FIELD_ID } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/constants'
import selectAttributes from './index'

const LABEL = 'End'
const ERROR = 'Invalid end'
const FUNCTION_TYPE = 'function'
const onChange = vi.fn()
const PROPS: RangeFieldProps = {
  id: END_FIELD_ID,
  inputType: 'time',
  label: LABEL,
  value: END_OF_DAY_TIME,
  onChange,
}

describe('end select attributes', () => {
  it('keeps the controlled value, label and callback', () => {
    const attributes = selectAttributes(PROPS)

    expect(attributes.id).toBe(END_FIELD_ID)
    expect(attributes.value).toBe(END_OF_DAY_TIME)
    expect(attributes['aria-label']).toBe(LABEL)
    expect(attributes.onChange).toBeTypeOf(FUNCTION_TYPE)
  })

  it('links errors and honors the disabled state', () => {
    const attributes = selectAttributes({ ...PROPS, error: ERROR, disabled: true })

    expect(attributes.disabled).toBe(true)
    expect(attributes['aria-invalid']).toBe(true)
    expect(attributes['aria-describedby']).toBe(`${END_FIELD_ID}-error`)
  })
})
