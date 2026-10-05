import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { rpc: mocks.rpc } }))

import staffing from '.'

describe('staffing', () => {
  beforeEach(() => mocks.rpc.mockReset())

  it('replaces the whole set in one call, naming the leader', () => {
    const rows = [
      { usuario_id: 'usr-1', es_lider: false },
      { usuario_id: 'usr-2', es_lider: true },
    ]
    staffing('act-1', rows)

    const args = { p_actividad_id: 'act-1', p_usuario_ids: ['usr-1', 'usr-2'], p_lider_id: 'usr-2' }
    expect(mocks.rpc).toHaveBeenCalledWith('set_actividad_responsables', args)
  })

  it('sends a null leader, and an empty set to clear the task', () => {
    staffing('act-2', [])

    const args = { p_actividad_id: 'act-2', p_usuario_ids: [], p_lider_id: null }
    expect(mocks.rpc).toHaveBeenCalledWith('set_actividad_responsables', args)
  })
})
