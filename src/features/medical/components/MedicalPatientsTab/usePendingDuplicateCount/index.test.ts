import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

type DepsBox = { current: unknown[] }

const mocks = vi.hoisted(() => {
  const deps: DepsBox = { current: [] }
  return { countPending: vi.fn(), setCount: vi.fn(), deps }
})
vi.mock('@/shared/dedup', () => ({ countPending: mocks.countPending }))
// No DOM here: state is a spy and the effect runs inline, so the hook's read is observable.
vi.mock('react', () => ({
  useState: (initial: number) => [initial, mocks.setCount],
  useEffect: (effect: () => void, deps: unknown[]) => {
    mocks.deps.current = deps
    effect()
  },
}))

import usePendingDuplicateCount from '.'

const PAIRS = 3
const VIEW = 'list'
const settle = () => new Promise(resolve => setTimeout(resolve))

describe('usePendingDuplicateCount', () => {
  beforeEach(() => {
    mocks.countPending.mockReset()
    mocks.setCount.mockReset()
  })

  it('starts at zero before the count arrives', () => {
    mocks.countPending.mockResolvedValue(PAIRS)
    expect(usePendingDuplicateCount(VIEW)).toBe(0)
  })

  it('reads the patient pending-pair count and stores it', async () => {
    mocks.countPending.mockResolvedValue(PAIRS)
    usePendingDuplicateCount(VIEW)
    await settle()
    expect(mocks.countPending).toHaveBeenCalledWith('pacientes')
    expect(mocks.setCount).toHaveBeenCalledWith(PAIRS)
  })

  it('reads again whenever the view changes', () => {
    mocks.countPending.mockResolvedValue(PAIRS)
    usePendingDuplicateCount(VIEW)
    expect(mocks.deps.current).toEqual([VIEW])
  })

  it('shows no badge when the count fails, instead of throwing', async () => {
    mocks.countPending.mockRejectedValue(new Error('denied'))
    usePendingDuplicateCount(VIEW)
    await settle()
    expect(mocks.setCount).toHaveBeenCalledWith(0)
  })
})
