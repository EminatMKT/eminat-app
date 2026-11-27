import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { Row } from '@/features/tasks/components/reporte/WorkerReport/types'
import fetchWorkerTasks from '.'

const fetchGlobal = 'fetch'
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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchWorkerTasks', () => {
  it(
    'fetches the given month with the exact endpoint, encoded, and the abort signal',
    async () => {
      const controller = new AbortController()
      const rows = [row()]
      const response = { tasks: rows }
      const okResult = { ok: true, json: async () => response }
      const fetchMock = vi.fn(async () => okResult)

      vi.stubGlobal(fetchGlobal, fetchMock)

      const month = '2026-08'
      const result = await fetchWorkerTasks(month, controller.signal)

      expect(result).toEqual(rows)
      expect(fetchMock).toHaveBeenCalledTimes(1)

      const expectedUrl = `/api/tasks/report?month=${encodeURIComponent(month)}`
      const expectedInit = { signal: controller.signal }

      expect(fetchMock).toHaveBeenCalledWith(expectedUrl, expectedInit)
    },
  )

  it('URL-encodes a month value that needs it', async () => {
    const controller = new AbortController()
    const response = { tasks: [] }
    const okResult = { ok: true, json: async () => response }
    const fetchMock = vi.fn(async () => okResult)

    vi.stubGlobal(fetchGlobal, fetchMock)

    const month = '2026 08&x'

    await fetchWorkerTasks(month, controller.signal)

    const expectedUrl = `/api/tasks/report?month=${encodeURIComponent(month)}`
    const expectedInit = { signal: controller.signal }

    expect(fetchMock).toHaveBeenCalledWith(expectedUrl, expectedInit)
  })

  it(
    'rejects with the error message from the response body when the request fails',
    async () => {
      const controller = new AbortController()
      const notAuthorizedMessage = 'Not authorized'
      const errorBody = { error: notAuthorizedMessage }
      const failedResult = { ok: false, json: async () => errorBody }

      vi.stubGlobal(fetchGlobal, vi.fn(async () => failedResult))

      const month = '2026-08'
      const promise = fetchWorkerTasks(month, controller.signal)

      await expect(promise).rejects.toThrow(notAuthorizedMessage)
    },
  )

  it(
    'rejects with the literal fallback message "Error" when the body has no error field',
    async () => {
      const controller = new AbortController()
      const emptyErrorBody = {}
      const failedResult = { ok: false, json: async () => emptyErrorBody }

      vi.stubGlobal(fetchGlobal, vi.fn(async () => failedResult))

      const month = '2026-08'
      const promise = fetchWorkerTasks(month, controller.signal)
      const fallbackErrorMessage = 'Error'

      await expect(promise).rejects.toThrow(fallbackErrorMessage)
    },
  )
})
