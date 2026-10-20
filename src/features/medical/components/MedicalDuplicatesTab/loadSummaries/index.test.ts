import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import loadSummaries from '.'

vi.mock('@/shared/db/supabase', () => ({ supabase: {} }))
vi.mock('@/features/medical/data/patientNames', () => ({
  default: async () => [{ id: 'a', nombre: 'Ana', apellido: 'Lopez' }],
}))

const anaSummary = { a: 'Ana Lopez' }

describe('loadSummaries', () => {
  it('maps each id to the same summary the open pair shows', async () => {
    expect(await loadSummaries(['a'])).toEqual(anaSummary)
  })
})
