import { describe, expect, it } from 'vitest'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import {
  NINE_AM,
  NINE_TO_ONE_TEXT,
  ONE_PM,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/constants'
import { BLOCK_LABEL_KEY, BLOCK_LABEL_READ_ONLY_KEY } from '../constants'
import accessibleLabel from '.'

const NOTE = 'Clase'
const EMPTY_NOTE_PLACEHOLDER = '"note":""'

const translate = (key: string, vars?: Record<string, unknown>): string =>
  vars ? `${key}:${JSON.stringify(vars)}` : key

const range: WeeklyAvailabilityRange = { weekday: 1, startsAt: NINE_AM, endsAt: ONE_PM }
const rangeWithNote: WeeklyAvailabilityRange = { ...range, note: NOTE }

describe('accessibleLabel', () => {
  it('uses the editable key when the range can be edited', () => {
    const label = accessibleLabel(range, false, translate)

    expect(label).toContain(BLOCK_LABEL_KEY)
  })

  it('uses the read-only key when the range cannot be edited', () => {
    const label = accessibleLabel(range, true, translate)

    expect(label).toContain(BLOCK_LABEL_READ_ONLY_KEY)
  })

  it('carries the formatted time range', () => {
    const label = accessibleLabel(range, false, translate)

    expect(label).toContain(NINE_TO_ONE_TEXT)
  })

  it('includes the note, separated from the time, when present', () => {
    const label = accessibleLabel(rangeWithNote, false, translate)

    expect(label).toContain(NOTE)
  })

  it('carries an empty note placeholder when the range has none', () => {
    const label = accessibleLabel(range, false, translate)

    expect(label).toContain(EMPTY_NOTE_PLACEHOLDER)
  })
})
