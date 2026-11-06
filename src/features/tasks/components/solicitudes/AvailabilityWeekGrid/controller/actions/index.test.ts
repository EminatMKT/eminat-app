import { expect, it, vi } from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import createGridActions from '.'

const RANGE: EditableRange = {
  clientId: 'monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}

function fixture() {
  const input = {
    ranges: [RANGE],
    readOnly: false,
    onChange: vi.fn(),
    select: vi.fn(),
    markCreated: vi.fn(),
  }

  return input
}

it('creates click blocks without opening and drag blocks with selection by identity', () => {
  const input = fixture()
  const actions = createGridActions(input)
  const bounds = { start: 600, end: 660 }

  actions.onCreate(AVAILABILITY_DAYS[0], bounds, false)
  expect(input.onChange).toHaveBeenCalledOnce()
  expect(input.select).not.toHaveBeenCalled()
  actions.onCreate(AVAILABILITY_DAYS[0], bounds, true)
  const created = input.onChange.mock.calls[1][0][1]

  expect(input.select).toHaveBeenCalledWith(created.clientId)
})

it('opens keyboard additions and keeps midnight canonical', () => {
  const input = fixture()
  const actions = createGridActions(input)
  const slot = { startsAt: '23:30', endsAt: '24:00' }

  actions.onAdd(AVAILABILITY_DAYS[1], slot)
  const created = input.onChange.mock.calls[0][0][1]

  expect(created).toMatchObject(slot)
  expect(input.select).toHaveBeenCalledWith(created.clientId)
})

it('validates saves across the whole week and preserves identity', () => {
  const input = fixture()
  const actions = createGridActions(input)
  const draft = { startsAt: '10:00', endsAt: '11:00', note: 'updated' }

  actions.onSave(RANGE.clientId, draft)
  expect(input.onChange.mock.calls[0][0][0]).toEqual({ ...RANGE, ...draft })
  expect(input.select).toHaveBeenCalledWith(null)
})

it('rejects overlap creation and invalid saves without closing selection', () => {
  const input = fixture()
  const actions = createGridActions(input)
  const bounds = { start: 570, end: 630 }
  const invalid = { startsAt: '12:00', endsAt: '11:00', note: '' }

  actions.onCreate(AVAILABILITY_DAYS[0], bounds, true)
  actions.onSave(RANGE.clientId, invalid)
  expect(input.onChange).not.toHaveBeenCalled()
  expect(input.select).not.toHaveBeenCalled()
})

it('removes only the chosen identity and closes the dialog', () => {
  const input = fixture()
  const actions = createGridActions(input)

  actions.onRemove(RANGE.clientId)
  expect(input.onChange).toHaveBeenCalledWith([])
  expect(input.select).toHaveBeenCalledWith(null)
})

it('permits read-only viewing and closing, but blocks every mutation', () => {
  const input = fixture()

  input.readOnly = true
  const actions = createGridActions(input)
  const bounds = { start: 600, end: 660 }
  const slot = { startsAt: '10:00', endsAt: '11:00' }
  const draft = { startsAt: slot.startsAt, endsAt: slot.endsAt, note: '' }

  actions.onOpen(RANGE)
  actions.onClose()
  actions.onCreate(AVAILABILITY_DAYS[0], bounds, true)
  actions.onAdd(AVAILABILITY_DAYS[0], slot)
  actions.onSave(RANGE.clientId, draft)
  actions.onRemove(RANGE.clientId)
  expect(input.onChange).not.toHaveBeenCalled()
  expect(input.select.mock.calls).toEqual([[RANGE.clientId], [null]])
})

it('ignores a stale dialog identity rather than writing an unchanged week', () => {
  const input = fixture()
  const actions = createGridActions(input)
  const draft = { startsAt: '10:00', endsAt: '11:00', note: '' }
  const removedId = 'removed'

  actions.onSave(removedId, draft)
  actions.onRemove(removedId)
  expect(input.onChange).not.toHaveBeenCalled()
})
