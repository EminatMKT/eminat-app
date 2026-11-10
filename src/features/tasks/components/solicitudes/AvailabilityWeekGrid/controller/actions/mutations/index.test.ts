import { expect, it, vi } from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import mutations from '.'

const RANGE: EditableRange = {
  clientId: 'first',
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

it('rejects missing identities and never modifies a read-only week', () => {
  const input = fixture()

  input.readOnly = true
  const actions = mutations(input)
  const id = 'absent'
  const draft = { startsAt: '09:00', endsAt: '10:00', note: '' }

  actions.onSave(id, draft)
  actions.onRemove(id)
  expect(input.onChange).not.toHaveBeenCalled()
})

it('clears markCreated once a save commits', () => {
  const input = fixture()
  const actions = mutations(input)
  const draft = { startsAt: '10:00', endsAt: '11:00', note: '' }

  actions.onSave(RANGE.clientId, draft)
  expect(input.markCreated).toHaveBeenCalledWith(null)
})

it('clears markCreated once a remove commits', () => {
  const input = fixture()
  const actions = mutations(input)

  actions.onRemove(RANGE.clientId)
  expect(input.markCreated).toHaveBeenCalledWith(null)
})
