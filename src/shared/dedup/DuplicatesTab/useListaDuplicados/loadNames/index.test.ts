import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import pendienteFixture from '@/shared/dedup/DuplicatesTab/pendienteFixture'
import loadNames from '.'

const secondPair = { item_id_a: 'a', item_id_b: 'c' }
const pairs = [pendienteFixture(), pendienteFixture(secondPair)]
const anaOnly = { a: 'Ana' }
const noNames = {}

describe('loadNames', () => {
  it('asks for every distinct id once', async () => {
    const loadSummaries = vi.fn(async (_ids: string[]) => anaOnly)
    expect(await loadNames(pairs, loadSummaries)).toEqual(anaOnly)
    expect([...loadSummaries.mock.calls[0][0]].sort()).toEqual(['a', 'b', 'c'])
  })

  // A failed name read is never a failed queue.
  it('resolves with no names when the read fails', async () => {
    expect(await loadNames(pairs, async () => { throw new Error('network') })).toEqual(noNames)
  })

  it('does not ask when nothing is pending', async () => {
    const loadSummaries = vi.fn()
    await loadNames([], loadSummaries)
    expect(loadSummaries).not.toHaveBeenCalled()
  })
})
