import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db', () => ({ supabase: { from: mocks.from } }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: mocks.from } }))

import queries from './queries'
import { ID_COLUMN, EMAIL_COLUMN, GENERO_COLUMN, TELEFONO_COLUMN, FECHA_NACIMIENTO_COLUMN, IS_OPERATOR, COUNT_ONLY } from './constants'

type Chain = Record<string, unknown>

function stubChain(count: number): Chain {
  const chain: Chain = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.not = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.gt = vi.fn(self)
  chain.lte = vi.fn(self)
  chain.like = vi.fn(self)
  chain.then = (resolve: (value: unknown) => unknown) => {
    const resolved = { count, error: null }
    return Promise.resolve(resolve(resolved))
  }
  return chain
}

describe('queries', () => {
  it('counts the whole registry with a bare select', async () => {
    const chain = stubChain(10)
    mocks.from.mockReturnValue(chain)
    expect(await queries.countTotalPatients()).toBe(10)
    expect(chain.select).toHaveBeenCalledWith(ID_COLUMN, COUNT_ONLY)
  })

  it('filters on a non-null email for reach', async () => {
    const chain = stubChain(5)
    mocks.from.mockReturnValue(chain)
    await queries.countWithEmail()
    expect(chain.not).toHaveBeenCalledWith(EMAIL_COLUMN, IS_OPERATOR, null)
  })

  it('filters genero by the given value', async () => {
    const chain = stubChain(3)
    mocks.from.mockReturnValue(chain)
    await queries.countByGenero('F')
    expect(chain.eq).toHaveBeenCalledWith(GENERO_COLUMN, 'F')
  })

  it('filters birth date strictly after a cutoff', async () => {
    const chain = stubChain(1)
    mocks.from.mockReturnValue(chain)
    await queries.countBornAfter('2008-01-01')
    expect(chain.gt).toHaveBeenCalledWith(FECHA_NACIMIENTO_COLUMN, '2008-01-01')
  })

  it('filters birth date in an (older, younger] band', async () => {
    const chain = stubChain(1)
    mocks.from.mockReturnValue(chain)
    await queries.countBornBetween('1990-01-01', '2008-01-01')
    expect(chain.gt).toHaveBeenCalledWith(FECHA_NACIMIENTO_COLUMN, '1990-01-01')
    expect(chain.lte).toHaveBeenCalledWith(FECHA_NACIMIENTO_COLUMN, '2008-01-01')
  })

  it('filters birth date on or before a cutoff', async () => {
    const chain = stubChain(1)
    mocks.from.mockReturnValue(chain)
    await queries.countBornOnOrBefore('1960-01-01')
    expect(chain.lte).toHaveBeenCalledWith(FECHA_NACIMIENTO_COLUMN, '1960-01-01')
  })

  it('matches a phone prefix formatted as "(XXX)%", never a bare digit pattern', async () => {
    const chain = stubChain(1)
    mocks.from.mockReturnValue(chain)
    await queries.countByAreaCode('305')
    expect(chain.like).toHaveBeenCalledWith(TELEFONO_COLUMN, '(305)%')
  })
})
