import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: mocks.from } }))

import countPending from '.'

const PAIRS = 4

function stubChain(count: number | null, error: unknown = null) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ count, error, data: null }))
  return chain
}

describe('countPending', () => {
  beforeEach(() => mocks.from.mockReset())

  it('counts duplicados_pendientes for one entidad without fetching rows', async () => {
    const chain = stubChain(PAIRS)
    mocks.from.mockReturnValue(chain)

    const total = await countPending('pacientes')

    expect(mocks.from).toHaveBeenCalledWith('duplicados_pendientes')
    expect(chain.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
    expect(chain.eq).toHaveBeenCalledWith('entidad', 'pacientes')
    expect(total).toBe(PAIRS)
  })

  it('reads a missing count as zero', async () => {
    mocks.from.mockReturnValue(stubChain(null))
    expect(await countPending('pacientes')).toBe(0)
  })

  it('rejects when the read fails', async () => {
    mocks.from.mockReturnValue(stubChain(null, new Error('boom')))
    await expect(countPending('pacientes')).rejects.toThrow('boom')
  })
})
