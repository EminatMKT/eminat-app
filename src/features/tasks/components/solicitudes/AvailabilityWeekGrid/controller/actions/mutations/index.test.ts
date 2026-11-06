import { expect, it, vi } from 'vitest'
import mutations from '.'

it('rejects missing identities and never modifies a read-only week', () => {
  const input = {
    ranges: [],
    readOnly: true,
    onChange: vi.fn(),
    select: vi.fn(),
  }
  const actions = mutations(input)
  const id = 'absent'
  const draft = { startsAt: '09:00', endsAt: '10:00', note: '' }

  actions.onSave(id, draft)
  actions.onRemove(id)
  expect(input.onChange).not.toHaveBeenCalled()
})
