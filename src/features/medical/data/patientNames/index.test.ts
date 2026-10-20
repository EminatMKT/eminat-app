import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import patientNames from '.'

const mocks = vi.hoisted(() => {
  const batches: string[][] = []
  const answers: unknown[] = []
  const recorded = { batches, answers }
  return recorded
})
vi.mock('@/shared/db/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: (_column: string, batch: string[]) => {
          mocks.batches.push(batch)
          const query = { overrideTypes: async () => mocks.answers.shift() }
          return query
        },
      }),
    }),
  },
}))

const ids = Array.from(Array(150).keys(), i => `id-${i}`)
const loaded = (id: string) => ({ data: [{ id, nombre: 'Ana', apellido: 'Lopez' }], error: null })
const failed = { data: null, error: new Error('denied') }

describe('patientNames', () => {
  beforeEach(() => {
    mocks.batches.length = 0
    mocks.answers.length = 0
  })

  // A long pending list must not build one request URL past what the API gateway accepts.
  it('reads the ids in batches of at most 100', async () => {
    mocks.answers.push(loaded('id-0'), loaded('id-100'))
    await patientNames(ids)
    expect(mocks.batches.map(batch => batch.length)).toEqual([100, 50])
  })

  // One failed batch must not throw away the names another batch did load.
  it('keeps the batches that loaded when another one fails', async () => {
    mocks.answers.push(loaded('id-0'), failed)
    expect((await patientNames(ids)).map(row => row.id)).toEqual(['id-0'])
  })

  it('rejects only when every batch failed', async () => {
    mocks.answers.push(failed, failed)
    await expect(patientNames(ids)).rejects.toThrow('denied')
  })
})
