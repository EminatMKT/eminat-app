import { describe, expect, it } from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import AvailabilityRangeItem from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem'
import type { DaySectionRangeItemArgs } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/DaySection/types'
import renderRangeItems from './index'

const CLIENT_ID = 'range-client'
const WEEKDAY = 1
const RANGE: EditableRange = {
  clientId: CLIENT_ID,
  weekday: WEEKDAY,
  startsAt: '09:00',
  endsAt: '17:00',
  note: '',
}

const ARGS: DaySectionRangeItemArgs = {
  range: RANGE,
  rangeIndex: 0,
  context: {
    label: 'Monday',
    errors: [],
    onChangeRange: () => undefined,
    onRemoveRange: () => undefined,
  },
}

describe('renderRangeItem', () => {
  it('creates the child with the stable client identity as its key', () => {
    const items = renderRangeItems([RANGE], ARGS.context)
    const item = items[0]

    expect(item.type).toBe(AvailabilityRangeItem)
    expect(item.key).toBe(CLIENT_ID)
  })
})

// The range renderer owns the stable identity boundary between a day and its child items.
