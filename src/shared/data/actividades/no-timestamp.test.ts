import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: mocks.from } }))

import { update } from '../actividades'

describe('actividadesRepo missing optimistic timestamp', () => {
  beforeEach(() => mocks.from.mockReset())

  it('does not write when expectedUpdatedAt is undefined', async () => {
    const result = await update('act-1', { titulo: 'Local change' }, undefined)
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
