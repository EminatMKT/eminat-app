import { describe, expect, it } from 'vitest'
import { RANGE_FIELD_CONSTANTS }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/constants'
import noteCounterProps from './index'

const MAX = RANGE_FIELD_CONSTANTS.noteMaxLength
const translate = (_key: string, vars?: Record<string, unknown>) => `remaining:${vars?.remaining}`

describe('noteCounterProps', () => {
  it('reports how many characters are left, well under the limit', () => {
    const props = noteCounterProps('a'.repeat(10), translate)

    expect(props.counterText).toBe(`remaining:${MAX - 10}`)
    expect(props.counterNearLimit).toBe(false)
  })

  it('flags near the limit at the warning threshold', () => {
    const atThreshold = Math.ceil(MAX * 0.9)
    const props = noteCounterProps('a'.repeat(atThreshold), translate)

    expect(props.counterNearLimit).toBe(true)
  })

  it('does not flag near the limit just below the warning threshold', () => {
    const belowThreshold = Math.ceil(MAX * 0.9) - 1
    const props = noteCounterProps('a'.repeat(belowThreshold), translate)

    expect(props.counterNearLimit).toBe(false)
  })
})
