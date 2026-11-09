import { expect, it } from 'vitest'
import { translate, type I18nKey } from '@/shared/i18n'
import { declaredWeeklyHours } from '@/features/tasks/utils/availability'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import summaryOf from '.'

const RANGE: EditableRange = {
  clientId: 'monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const DEFAULT_LOCALE = 'es'
const WORKDAY = { id: 'workday-1', name: 'Full time', hoursPerWeek: 40 }

function translateAt(key: I18nKey, vars?: Record<string, string | number>) {
  return translate(DEFAULT_LOCALE, key, vars)
}

it('translates the declared weekly total and the empty-week message', () => {
  const ranges = [RANGE]
  const summary = summaryOf(ranges, WORKDAY, translateAt)
  const summaryVars = { hours: declaredWeeklyHours(ranges) }
  const total = translate(DEFAULT_LOCALE, EDITOR_COPY.weeklyHoursKey, summaryVars)
  const empty = translate(DEFAULT_LOCALE, EDITOR_COPY.emptyDay)
  const expected = { total, empty, noJornada: null }

  expect(summary).toEqual(expected)
})

it('adds the single no-jornada message when the member has no workday assigned', () => {
  const summary = summaryOf([RANGE], null, translateAt)
  const noJornada = translate(DEFAULT_LOCALE, EDITOR_COPY.noJornadaAssigned)

  expect(summary.noJornada).toBe(noJornada)
})
