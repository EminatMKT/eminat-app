import { describe, expect, it } from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import rangesHaveChanged from './index'

const ORIGINAL: EditableRange = {
  id: 'monday-1',
  clientId: 'monday-1',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '13:00',
  note: null,
}
const SECOND: EditableRange = {
  id: 'tuesday-1',
  clientId: 'tuesday-1',
  weekday: 2,
  startsAt: '10:00',
  endsAt: '12:00',
  note: 'standup',
}

describe('rangesHaveChanged', () => {
  it('is not a change when the values match, even with a different client id', () => {
    const resaved: EditableRange = { ...ORIGINAL, id: undefined, clientId: 'draft-1' }

    expect(rangesHaveChanged([ORIGINAL], [resaved])).toBe(false)
  })

  it('is a change when a range was added', () => {
    expect(rangesHaveChanged([ORIGINAL], [ORIGINAL, SECOND])).toBe(true)
  })

  it('is a change when a time was edited', () => {
    const edited: EditableRange = { ...ORIGINAL, endsAt: '14:00' }

    expect(rangesHaveChanged([ORIGINAL], [edited])).toBe(true)
  })

  it('is a change when a range was removed', () => {
    expect(rangesHaveChanged([ORIGINAL, SECOND], [ORIGINAL])).toBe(true)
  })

  it('is not a change once an edit is reverted back to the saved values', () => {
    const edited: EditableRange = { ...ORIGINAL, endsAt: '14:00' }
    const reverted: EditableRange = { ...edited, endsAt: ORIGINAL.endsAt }

    expect(rangesHaveChanged([ORIGINAL], [reverted])).toBe(false)
  })

  it('ignores order', () => {
    expect(rangesHaveChanged([ORIGINAL, SECOND], [SECOND, ORIGINAL])).toBe(false)
  })
})
