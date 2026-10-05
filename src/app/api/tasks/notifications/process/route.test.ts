import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }))
vi.mock('@/features/tasks/server/notifications', () => ({ default: dispatch }))
import { GET } from './route'

const request = (token?: string) => new NextRequest('https://preview.example/api/tasks/notifications/process', {
  headers: token ? { authorization: `Bearer ${token}` } : {},
})
beforeEach(() => { process.env.CRON_SECRET = 'synthetic-cron-secret'; dispatch.mockResolvedValue({ warning: null, processed: 2 }) })
afterEach(() => { delete process.env.CRON_SECRET; vi.clearAllMocks() })

it('rejects unauthenticated invocations without claiming any email', async () => {
  expect((await GET(request())).status).toBe(401)
  expect(dispatch).not.toHaveBeenCalled()
})
it('processes due events with the configured cron secret', async () => {
  const response = await GET(request('synthetic-cron-secret'))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ warning: null, processed: 2 })
  expect(dispatch).toHaveBeenCalledOnce()
})
