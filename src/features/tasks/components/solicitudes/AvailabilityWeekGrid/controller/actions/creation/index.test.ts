import { expect, it, vi } from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import creation from '.'

it('opens a valid keyboard-created midnight slot by its new identity', () => {
  const context = {
    ranges: [],
    readOnly: false,
    onChange: vi.fn(),
    select: vi.fn(),
  }
  const actions = creation(context)
  const slot = { startsAt: '23:30', endsAt: '24:00' }

  actions.onAdd(AVAILABILITY_DAYS[0], slot)
  const created = context.onChange.mock.calls[0][0][0]

  expect(created).toMatchObject(slot)
  expect(context.select).toHaveBeenCalledWith(created.clientId)
})
