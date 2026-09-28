import { expect, it } from 'vitest'
import reminderGroup from './index'
it('separates dates and excludes paid records', () => {
  expect(reminderGroup({ dueDate: '2026-09-22', today: '2026-09-23', isPaid: false })).toBe('overdue')
  expect(reminderGroup({ dueDate: '2026-09-23', today: '2026-09-23', isPaid: false })).toBe('upcoming')
  expect(reminderGroup({ dueDate: '2026-09-24', today: '2026-09-23', isPaid: false })).toBe('upcoming')
  expect(reminderGroup({ dueDate: '2026-09-22', today: '2026-09-23', isPaid: true })).toBeNull()
})
