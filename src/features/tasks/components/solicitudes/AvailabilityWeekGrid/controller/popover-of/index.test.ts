import { expect, it, vi } from 'vitest'
import { translate, type I18nKey } from '@/shared/i18n'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import popoverOf from '.'

const RANGE: EditableRange = {
  clientId: 'monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const DEFAULT_LOCALE = 'es'
const MISSING_ID = 'missing'

function translateAt(key: I18nKey, vars?: Record<string, string | number>) {
  return translate(DEFAULT_LOCALE, key, vars)
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

function buildContext() {
  const props = {
    ranges: [RANGE],
    workday: null,
    readOnly: false,
    onChange: vi.fn(),
  }
  const context = { props, actions: buildActions(), t: translateAt }

  return context
}

it('returns null until the given identity matches a declared range', () => {
  const context = buildContext()

  expect(popoverOf(context, null)).toBeNull()
  expect(popoverOf(context, MISSING_ID)).toBeNull()
})

it('builds the matched range into PopoverProps, by identity and index', () => {
  const context = buildContext()
  const popover = popoverOf(context, RANGE.clientId)
  const label = translate(DEFAULT_LOCALE, AVAILABILITY_DAYS[0].labelKey)

  expect(popover?.range).toEqual(RANGE)
  expect(popover?.rangeIndex).toBe(0)
  expect(popover?.dayLabel).toBe(label)
  expect(popover?.onSave).toBe(context.actions.onSave)
})
