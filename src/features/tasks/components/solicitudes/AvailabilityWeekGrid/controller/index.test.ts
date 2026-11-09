import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { LocaleProvider, translate } from '@/shared/i18n'
import { AVAILABILITY_DAYS, declaredWeeklyHours } from '@/features/tasks/utils/availability'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { AvailabilityWeekGridProps } from '../types'
import useGridController from '.'

const RANGE: EditableRange = {
  clientId: 'monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const DEFAULT_LOCALE = 'es'
const EXPECTED_COLUMNS = 7
const PROPS: AvailabilityWeekGridProps = {
  ranges: [RANGE],
  workday: null,
  readOnly: false,
  onChange: vi.fn(),
}

let seen: ReturnType<typeof useGridController> | null = null

function Probe() {
  seen = useGridController(PROPS)

  return null
}

function draw() {
  renderToStaticMarkup(createElement(LocaleProvider, null, createElement(Probe)))
}

describe('useGridController', () => {
  it('builds one day entry per declared weekday, carrying the shared props', () => {
    draw()

    expect(seen?.days).toHaveLength(EXPECTED_COLUMNS)
    expect(seen?.days.map(day => day.day)).toEqual(AVAILABILITY_DAYS)
    expect(seen?.days[0].ranges).toBe(PROPS.ranges)
  })

  it('has no popover before any range is opened', () => {
    draw()

    expect(seen?.popover).toBeNull()
  })

  it('summarizes the weekly total, the empty-week message, and the no-jornada notice', () => {
    draw()
    const hours = declaredWeeklyHours(PROPS.ranges)
    const total = translate(DEFAULT_LOCALE, EDITOR_COPY.weeklyHoursKey, { hours })
    const empty = translate(DEFAULT_LOCALE, EDITOR_COPY.emptyDay)
    const noJornada = translate(DEFAULT_LOCALE, EDITOR_COPY.noJornadaAssigned)
    const expected = { total, empty, noJornada }

    expect(seen?.summary).toEqual(expected)
  })
})

// Limits itself to what renderToStaticMarkup can observe, matching this repo's Popover/controller
// precedent: initial shape only. Selection and popover-building are createGridActions' and
// popoverOf's own concern, already proven by createGridActions' exhaustive test.
