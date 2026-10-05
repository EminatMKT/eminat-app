import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ optimisticUpdate: vi.fn() }))
vi.mock('../optimistic-update', () => ({ default: mocks.optimisticUpdate }))

import updateDeliveryDate from '.'

describe('updateDeliveryDate', () => {
  it('writes only fecha_entrega, never the payment period', () => {
    updateDeliveryDate('act-1', '2026-10-02', '2026-10-01T00:00:00Z')

    expect(mocks.optimisticUpdate).toHaveBeenCalledWith('act-1', { fecha_entrega: '2026-10-02' }, '2026-10-01T00:00:00Z')
  })
})
