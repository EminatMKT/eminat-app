import { expect, it, vi } from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import createConfig from '.'

const RANGE: EditableRange = {
  clientId: 'monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const NOOP = () => undefined
const ZERO_TOP = () => 0

function buildProps() {
  const props = {
    day: AVAILABILITY_DAYS[0],
    ranges: [RANGE],
    workday: null,
    readOnly: false,
    onChange: NOOP,
    onOpen: NOOP,
    onCreate: vi.fn(),
    onAdd: NOOP,
  }

  return props
}

const NOOP_PREVIEW = () => undefined

it("filters dayRanges to the config's own weekday and tracks live readOnly", () => {
  const props = buildProps()
  const config = createConfig(() => props, ZERO_TOP, NOOP_PREVIEW)

  expect(config.dayRanges).toEqual([RANGE])
  props.readOnly = true
  expect(config.readOnly).toBe(true)
})

it('commits a created range through the live onCreate, carrying openPopover as open', () => {
  const props = buildProps()
  const config = createConfig(() => props, ZERO_TOP, NOOP_PREVIEW)
  const bounds = { start: 600, end: 660 }

  config.onCommit({ bounds, openPopover: true })

  expect(props.onCreate).toHaveBeenCalledWith(props.day, bounds, true)
})

it('forwards a live preview straight to the given onPreviewChange', () => {
  const props = buildProps()
  const onPreviewChange = vi.fn()
  const config = createConfig(() => props, ZERO_TOP, onPreviewChange)
  const bounds = { start: 60, end: 120 }

  config.onPreview(bounds)

  expect(onPreviewChange).toHaveBeenCalledWith(bounds)
})
