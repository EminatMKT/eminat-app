import { expect, it, vi } from 'vitest'
import { translate, type I18nKey } from '@/shared/i18n'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import { EDITOR_COPY }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import keyboardAttrs from '.'
import type { TrackInput } from '../types'

const MONDAY = AVAILABILITY_DAYS[0]
const DEFAULT_LOCALE = 'es'
const EXPECTED_TAB_INDEX = 0
const ANY_FUNCTION = expect.any(Function)

function buildProps() {
  const props = {
    day: MONDAY,
    ranges: [],
    workday: null,
    readOnly: false,
    onChange: () => undefined,
    onOpen: () => undefined,
    onCreate: () => undefined,
    onAdd: vi.fn(),
  }

  return props
}

function translateHere(key: I18nKey, vars?: Record<string, string>) {
  return translate(DEFAULT_LOCALE, key, vars)
}

function buildTrackInput(): TrackInput {
  const input = { dayRanges: [], columnTop: () => 0, t: translateHere }

  return input
}

it('returns no attrs when the grid is read-only', () => {
  const readOnlyProps = { ...buildProps(), readOnly: true }
  const attrs = keyboardAttrs(readOnlyProps, buildTrackInput())

  expect(attrs).toEqual({})
})

it('offers a focusable, labeled, keyboard-handled track when editable', () => {
  const trackInput = buildTrackInput()
  const attrs = keyboardAttrs(buildProps(), trackInput)
  const dayLabel = trackInput.t(MONDAY.labelKey)
  const expectedLabel = trackInput.t(EDITOR_COPY.addRangeHint, { day: dayLabel })

  expect(attrs.tabIndex).toBe(EXPECTED_TAB_INDEX)
  expect(attrs['aria-label']).toBe(expectedLabel)
  expect(attrs.onKeyDown).toEqual(ANY_FUNCTION)
})
