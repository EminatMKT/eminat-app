import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: mocks.from } }))

import optimisticUpdate from '.'

describe('optimisticUpdate missing timestamp', () => {
  beforeEach(() => mocks.from.mockReset())

  it('does not write when expectedUpdatedAt is undefined', async () => {
    const result = await optimisticUpdate('act-1', { titulo: 'Local change' }, undefined)
    const expected = {
      data: null,
      error: null,
      conflict: true,
      current: null,
    }

    expect(mocks.from).not.toHaveBeenCalled()
    expect(result).toEqual(expected)
  })
})
