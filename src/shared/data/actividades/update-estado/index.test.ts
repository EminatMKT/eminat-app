import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ optimisticUpdate: vi.fn() }))
vi.mock('../optimistic-update', () => ({ default: mocks.optimisticUpdate }))

import updateEstado from '.'

describe('updateEstado', () => {
  it('writes only the state, checked against the version the screen read', () => {
    updateEstado('act-1', 'En proceso', '2026-10-01T00:00:00Z')

    expect(mocks.optimisticUpdate).toHaveBeenCalledWith('act-1', { estado: 'En proceso' }, '2026-10-01T00:00:00Z')
  })
})
