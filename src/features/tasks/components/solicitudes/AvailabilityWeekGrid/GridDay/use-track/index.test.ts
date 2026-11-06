import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import useTrack from '.'

const RANGE: EditableRange = {
  clientId: 'monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const NOOP = () => undefined
const FUNCTION_TYPE = 'function'
const PROPS = {
  day: AVAILABILITY_DAYS[0],
  ranges: [RANGE],
  workday: null,
  readOnly: false,
  onChange: NOOP,
  onOpen: NOOP,
  onCreate: vi.fn(),
  onAdd: NOOP,
}

let seen: ReturnType<typeof useTrack> | null = null

function Probe() {
  seen = useTrack(PROPS)

  return null
}

it('returns a track ref, a columnTop reader, and a stable create-gesture handler set', () => {
  renderToStaticMarkup(createElement(Probe))

  expect(seen?.trackRef.current).toBeNull()
  expect(seen?.columnTop()).toBe(0)
  expect(typeof seen?.gesture.onPointerDown).toBe(FUNCTION_TYPE)
})
