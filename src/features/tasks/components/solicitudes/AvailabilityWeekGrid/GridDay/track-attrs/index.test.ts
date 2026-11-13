import { expect, it, vi } from 'vitest'
import { translate, type I18nKey } from '@/shared/i18n'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import trackAttrs from '.'
import type { TrackBundle } from '../types'

const MONDAY = AVAILABILITY_DAYS[0]
const DEFAULT_LOCALE = 'es'
const EXPECTED_TAB_INDEX = 0
const ANY_FUNCTION = expect.any(Function)
// Matches the module's class names so the className assertions check the real selectors, not a
// content hash (same pattern as render-track/index.test.ts's CSS module mock). Named via
// vi.hoisted so the values exist before Vitest hoists the vi.mock call below it.
const { TRACK_CLASS, EDITABLE_CLASS, WEEK_GRID_CSS_MODULE_PATH } = vi.hoisted(() => ({
  TRACK_CLASS: 'track',
  EDITABLE_CLASS: 'editable',
  WEEK_GRID_CSS_MODULE_PATH:
    '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/index.module.css',
}))

vi.mock(WEEK_GRID_CSS_MODULE_PATH, () => ({
  default: { track: TRACK_CLASS, editable: EDITABLE_CLASS },
}))

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

function buildTrackInput() {
  const input = {
    dayRanges: [],
    columnTop: () => 0,
    t: translateHere,
  }

  return input
}

function buildGesture() {
  const gesture = {
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerUp: vi.fn(),
    onPointerCancel: vi.fn(),
    onLostPointerCapture: vi.fn(),
  }

  return gesture
}

function buildBundle(): TrackBundle {
  const bundle = {
    trackRef: { current: null },
    columnTop: () => 0,
    gesture: buildGesture(),
    preview: null,
    trackInput: buildTrackInput(),
  }

  return bundle
}

it('marks the track read-only, with no keyboard affordance, keeping the gesture handlers', () => {
  const props = { ...buildProps(), readOnly: true }
  const bundle = buildBundle()
  const attrs = trackAttrs(props, bundle)

  expect(attrs.className).toBe(TRACK_CLASS)
  expect(attrs.tabIndex).toBeUndefined()
  expect(attrs.onPointerDown).toBe(bundle.gesture.onPointerDown)
})

it('marks the track editable, with a focusable keyboard affordance over the gesture handlers', () => {
  const bundle = buildBundle()
  const attrs = trackAttrs(buildProps(), bundle)

  expect(attrs.className).toBe(`${TRACK_CLASS} ${EDITABLE_CLASS}`)
  expect(attrs.tabIndex).toBe(EXPECTED_TAB_INDEX)
  expect(attrs.onKeyDown).toEqual(ANY_FUNCTION)
  expect(attrs.ref).toBe(bundle.trackRef)
  expect(attrs.onPointerDown).toBe(bundle.gesture.onPointerDown)
})
