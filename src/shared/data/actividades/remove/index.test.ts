import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: mocks.from } }))

import remove from '.'

describe('remove', () => {
  it('deletes the task by id and reads the deleted row back as a single row', async () => {
    const deleted = { data: { id: 'act-1' }, error: null }
    const query = {
      delete: vi.fn(() => query),
      eq: vi.fn(() => query),
      select: vi.fn(() => query),
      single: vi.fn(async () => deleted),
    }
    mocks.from.mockReturnValue(query)

    const result = await remove('act-1')

    expect(mocks.from).toHaveBeenCalledWith('actividades')
    expect(query.eq).toHaveBeenCalledWith('id', 'act-1')
    expect(query.single).toHaveBeenCalled()
    expect(result).toEqual(deleted)
  })
})
