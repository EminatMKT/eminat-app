import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { dispatch, requireTasks, taskLookup } = vi.hoisted(() => ({ dispatch: vi.fn(), requireTasks: vi.fn(), taskLookup: vi.fn() }))
vi.mock('@/features/tasks/server/notifications', () => ({ default: dispatch }))
vi.mock('@/shared/db/requireAccess/requireModule', () => ({ default: requireTasks }))
vi.mock('@/shared/db/requireAccess/ssrClient', () => ({ default: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: taskLookup }) }) }) }) }))
import { GET, POST } from './route'

const request = (token?: string) => new NextRequest('https://preview.example/api/tasks/notifications/process', {
  headers: token ? { authorization: `Bearer ${token}` } : {},
})
beforeEach(() => {
  process.env.CRON_SECRET = 'synthetic-cron-secret'
  dispatch.mockResolvedValue({ warning: null, processed: 2 })
  requireTasks.mockResolvedValue({ ok: true, userId: 'viewer' })
  taskLookup.mockResolvedValue({ data: { id: '22222222-2222-4222-8222-222222222222' } })
})
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
it('flushes a visible Task after an authenticated assignment edit', async () => {
  const activityId = '22222222-2222-4222-8222-222222222222'
  const response = await POST(new NextRequest(request().url, { method: 'POST', body: JSON.stringify({ activityId }) }))
  expect(response.status).toBe(200)
  expect(dispatch).toHaveBeenCalledWith(activityId)
})
it('does not flush a Task outside the caller’s scope', async () => {
  taskLookup.mockResolvedValue({ data: null })
  const response = await POST(new NextRequest(request().url, { method: 'POST', body: JSON.stringify({ activityId: '22222222-2222-4222-8222-222222222222' }) }))
  expect(response.status).toBe(404)
  expect(dispatch).not.toHaveBeenCalled()
})
