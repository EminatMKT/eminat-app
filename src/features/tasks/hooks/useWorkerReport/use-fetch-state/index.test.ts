import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { Row } from '@/features/tasks/components/reporte/WorkerReport/types'
import type { FetchState } from '../types'

// No DOM in this suite: react's useState/useEffect run synchronously, same technique as
// src/shared/hooks/useCrashRecovery/index.test.ts.
const { fakes, reactModulePath, fetchTasksModulePath } = vi.hoisted(() => ({
  fakes: {
    setState: vi.fn(),
    fetchWorkerTasks: vi.fn(),
    cleanups: [] as Array<(() => void) | undefined>,
  },
  reactModulePath: 'react',
  fetchTasksModulePath: '../fetch-tasks',
}))

vi.mock(reactModulePath, () => ({
  useState: (initial: unknown) => [initial, fakes.setState],
  useEffect: (effect: () => (() => void) | undefined) => {
    fakes.cleanups.push(effect())
  },
}))

vi.mock(fetchTasksModulePath, () => ({ default: fakes.fetchWorkerTasks }))

import useFetchState from '.'

const NO_OVERRIDES: Partial<Row> = {}

const row = (overrides: Partial<Row> = NO_OVERRIDES): Row => ({
  id: 'r1',
  titulo: 'Post',
  empresa: 'EMC',
  estado: 'completado',
  fecha_inicio: '2026-08-17',
  fecha_entrega: null,
  ...overrides,
})

const userId = 'u1'
const month = '2026-08'
const networkErrorMessage = 'Network down'
const abortedMessage = 'aborted'
const staleErrorMessage = 'stale-error'
const priorRowId = 'prior'
const functionTypeof = 'function'
const INITIAL_STATE: FetchState = { tasks: [], error: '', loading: true }

const flush = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  fakes.setState.mockClear()
  fakes.fetchWorkerTasks.mockReset()
  fakes.cleanups.length = 0
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useFetchState', () => {
  it('does not fetch or update state when there is no signed-in user id', () => {
    const emptyUserId = ''

    useFetchState(emptyUserId, month)
    expect(fakes.fetchWorkerTasks).not.toHaveBeenCalled()
    expect(fakes.setState).not.toHaveBeenCalled()
  })

  it('does not fetch or update state when userId is undefined', () => {
    useFetchState(undefined, month)
    expect(fakes.fetchWorkerTasks).not.toHaveBeenCalled()
    expect(fakes.setState).not.toHaveBeenCalled()
  })

  it('fetches the given month with a real AbortSignal when a user id is present', () => {
    fakes.fetchWorkerTasks.mockResolvedValueOnce([])
    useFetchState(userId, month)
    expect(fakes.fetchWorkerTasks).toHaveBeenCalledTimes(1)
    const [calledMonth, signal] = fakes.fetchWorkerTasks.mock.calls[0]

    expect(calledMonth).toBe(month)
    expect(signal).toBeInstanceOf(AbortSignal)
  })

  it('sets the loading updater first, as a spread that only flips loading to true', async () => {
    const rows = [row()]

    fakes.fetchWorkerTasks.mockResolvedValueOnce(rows)
    useFetchState(userId, month)

    expect(fakes.setState).toHaveBeenCalledTimes(1)
    const [loadingUpdater] = fakes.setState.mock.calls[0]
    const priorState: FetchState = {
      tasks: [row({ id: priorRowId })],
      error: staleErrorMessage,
      loading: false,
    }

    expect(typeof loadingUpdater).toBe(functionTypeof)
    expect(loadingUpdater(priorState)).toEqual({ ...priorState, loading: true })

    await flush()
  })

  it('sets a plain replacement state with the fetched rows on success', async () => {
    const rows = [row()]

    fakes.fetchWorkerTasks.mockResolvedValueOnce(rows)
    useFetchState(userId, month)
    await flush()
    const expectedState = { tasks: rows, error: '', loading: false }

    expect(fakes.setState).toHaveBeenCalledTimes(2)
    expect(fakes.setState).toHaveBeenNthCalledWith(2, expectedState)
  })

  it('sets an updater that preserves stale tasks and replaces only the error on failure', async () => {
    fakes.fetchWorkerTasks.mockRejectedValueOnce(new Error(networkErrorMessage))
    useFetchState(userId, month)
    await flush()
    expect(fakes.setState).toHaveBeenCalledTimes(2)
    const [updater] = fakes.setState.mock.calls[1]
    const staleRow = row()
    const previousState: FetchState = { tasks: [staleRow], error: '' }
    const nextState = updater(previousState)
    const expectedState = { tasks: [staleRow], error: networkErrorMessage, loading: false }

    expect(nextState).toEqual(expectedState)
  })

  it('only applies the loading update when the fetch is aborted', async () => {
    const abortError = new Error(abortedMessage)

    abortError.name = 'AbortError'
    fakes.fetchWorkerTasks.mockRejectedValueOnce(abortError)
    useFetchState(userId, month)
    await flush()
    expect(fakes.setState).toHaveBeenCalledTimes(1)
    const [loadingUpdater] = fakes.setState.mock.calls[0]
    const priorState: FetchState = { tasks: [row()], error: staleErrorMessage }

    expect(loadingUpdater(priorState)).toEqual({ ...priorState, loading: true })
  })

  it('returns only the initial state, since the mocked useState never re-renders', async () => {
    fakes.fetchWorkerTasks.mockResolvedValueOnce([row()])
    const result = useFetchState(userId, month)

    expect(result).toEqual(INITIAL_STATE)
    await flush()
    expect(fakes.setState).toHaveBeenCalledTimes(2)
    expect(result).toEqual(INITIAL_STATE)
  })

  it('aborts the fetch signal when the effect cleanup runs', () => {
    const neverSettles = (): Promise<Row[]> => new Promise(() => {})

    fakes.fetchWorkerTasks.mockImplementation(neverSettles)
    useFetchState(userId, month)
    const [, signal] = fakes.fetchWorkerTasks.mock.calls[0]

    expect(signal.aborted).toBe(false)
    const cleanup = fakes.cleanups[fakes.cleanups.length - 1]

    cleanup?.()
    expect(signal.aborted).toBe(true)
  })
})
