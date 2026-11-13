import { expect, it, vi } from 'vitest'
import { translate, type I18nKey } from '@/shared/i18n'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
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
const NO_SELECTION = { selectedId: null, justCreatedId: null }

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
  const missingSelection = { selectedId: MISSING_ID, justCreatedId: null }

  expect(popoverOf(context, NO_SELECTION)).toBeNull()
  expect(popoverOf(context, missingSelection)).toBeNull()
})

it('builds the matched range into PopoverProps, by identity and index', () => {
  const context = buildContext()
  const selection = { selectedId: RANGE.clientId, justCreatedId: null }
  const popover = popoverOf(context, selection)
  const label = translate(DEFAULT_LOCALE, AVAILABILITY_DAYS[0].labelKey)

  expect(popover?.range).toEqual(RANGE)
  expect(popover?.rangeIndex).toBe(0)
  expect(popover?.dayLabel).toBe(label)
  expect(popover?.onSave).toBe(context.actions.onSave)
})

it('marks isNewlyCreated true only when the selection matches justCreatedId', () => {
  const context = buildContext()
  const justCreated = { selectedId: RANGE.clientId, justCreatedId: RANGE.clientId }
  const notJustCreated = { selectedId: RANGE.clientId, justCreatedId: null }

  expect(popoverOf(context, justCreated)?.isNewlyCreated).toBe(true)
  expect(popoverOf(context, notJustCreated)?.isNewlyCreated).toBe(false)
})
