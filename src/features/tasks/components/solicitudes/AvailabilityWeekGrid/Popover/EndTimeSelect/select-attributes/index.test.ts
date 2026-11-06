import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'
import selectAttributes from './index'

const ID = 'end-id'
const LABEL = 'End'
const ERROR = 'Invalid end'
const VALUE = '24:00'
const FUNCTION_TYPE = 'function'
const onChange = vi.fn()
const PROPS: RangeFieldProps = {
  id: ID,
  inputType: 'time',
  label: LABEL,
  value: VALUE,
  onChange,
}

describe('end select attributes', () => {
  it('keeps the controlled value, label and callback', () => {
    const attributes = selectAttributes(PROPS)

    expect(attributes.id).toBe(ID)
    expect(attributes.value).toBe(VALUE)
    expect(attributes['aria-label']).toBe(LABEL)
    expect(attributes.onChange).toBeTypeOf(FUNCTION_TYPE)
  })

  it('links errors and honors the disabled state', () => {
    const attributes = selectAttributes({ ...PROPS, error: ERROR, disabled: true })

    expect(attributes.disabled).toBe(true)
    expect(attributes['aria-invalid']).toBe(true)
    expect(attributes['aria-describedby']).toBe(`${ID}-error`)
  })
})
