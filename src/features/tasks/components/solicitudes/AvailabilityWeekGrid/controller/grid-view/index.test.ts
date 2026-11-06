import { expect, it, vi } from 'vitest'
import { translate, type I18nKey } from '@/shared/i18n'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import gridView from '.'

const RANGE: EditableRange = {
  clientId: 'monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const DEFAULT_LOCALE = 'es'
const EMPTY_DAY_KEY: I18nKey = 'tasks.availability.emptyDay'

function translateAt(key: I18nKey, vars?: Record<string, string | number>) {
  return translate(DEFAULT_LOCALE, key, vars)
}

function buildProps() {
  const props = {
    ranges: [RANGE],
    workday: null,
    readOnly: false,
    onChange: vi.fn(),
  }

  return props
}

function buildActions() {
  const actions = {
    onOpen: vi.fn(),
    onCreate: vi.fn(),
    onAdd: vi.fn(),
    onSave: vi.fn(),
    onRemove: vi.fn(),
    onClose: vi.fn(),
  }

  return actions
}

it('composes the days, popover, and summary for the currently selected identity', () => {
  const props = buildProps()
  const selection = { selectedId: RANGE.clientId, justCreatedId: null }
  const input = { actions: buildActions(), selection, t: translateAt }
  const view = gridView(props, input)

  expect(view.days).toHaveLength(AVAILABILITY_DAYS.length)
  expect(view.popover?.range).toEqual(RANGE)
  expect(view.summary.empty).toBe(translateAt(EMPTY_DAY_KEY))
})

it('has no popover while nothing is selected', () => {
  const props = buildProps()
  const selection = { selectedId: null, justCreatedId: null }
  const input = { actions: buildActions(), selection, t: translateAt }
  const view = gridView(props, input)

  expect(view.popover).toBeNull()
})

it('marks the popover as newly created when the selection matches justCreatedId', () => {
  const props = buildProps()
  const selection = { selectedId: RANGE.clientId, justCreatedId: RANGE.clientId }
  const input = { actions: buildActions(), selection, t: translateAt }
  const view = gridView(props, input)

  expect(view.popover?.isNewlyCreated).toBe(true)
})
