import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: mocks.from } }))

import create from '.'

const chain = (result: unknown) => {
  const query = {
    insert: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(async () => result),
  }
  return query
}

describe('create', () => {
  beforeEach(() => mocks.from.mockReset())

  it('inserts the payload and reads the row back with its responsables flattened', async () => {
    const saved = { id: 'act-1', titulo: 'Pauta', actividad_responsables: null }
    const query = chain({ data: saved, error: null })
    mocks.from.mockReturnValue(query)
    const payload = { titulo: 'Pauta' }

    const result = await create(payload)

    expect(query.insert).toHaveBeenCalledWith(payload)
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining('actividad_responsables!'))
    expect(result.data).toEqual({ id: 'act-1', titulo: 'Pauta', responsables: [] })
  })

  it('a rejected insert keeps its error and null data', async () => {
    const query = chain({ data: null, error: { message: 'rls' } })
    mocks.from.mockReturnValue(query)

    const result = await create({})

    expect(result.data).toBeNull()
    expect(result.error).toEqual({ message: 'rls' })
  })
})
