import { describe, expect, it } from 'vitest'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import orderMembers from '.'

const member = (overrides: Partial<AvailabilityMemberDto>): AvailabilityMemberDto => ({
  id: 'member-1',
  name: 'Member',
  team: null,
  workday: null,
  ranges: [],
  canEdit: false,
  ...overrides,
})

describe('orderMembers', () => {
  it('keeps the list unchanged when the own row is already first', () => {
    const own = member({ id: 'm1', canEdit: true })
    const other = member({ id: 'm2' })

    expect(orderMembers([own, other])).toEqual([own, other])
  })

  it('moves the own row to the front when it sits in the middle', () => {
    const first = member({ id: 'm1' })
    const own = member({ id: 'm2', canEdit: true })
    const last = member({ id: 'm3' })

    expect(orderMembers([first, own, last])).toEqual([own, first, last])
  })

  it('leaves the list unchanged when no row is editable', () => {
    const first = member({ id: 'm1' })
    const second = member({ id: 'm2' })

    expect(orderMembers([first, second])).toEqual([first, second])
  })

  it('returns an empty array unchanged', () => {
    expect(orderMembers([])).toEqual([])
  })
})
