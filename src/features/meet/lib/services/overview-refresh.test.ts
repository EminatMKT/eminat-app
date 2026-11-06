import { expect, it, vi } from 'vitest'
import { overviewRead, overviewRefresh } from './overview-refresh'

const drain = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }
it('coalesces focus/visibility/mount and retains one trailing refresh without overlap', async () => {
  let finish!: () => void
  const run = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
  const refresh = overviewRefresh(run, vi.fn())
  refresh.trigger(); refresh.trigger(); refresh.trigger()
  await drain()
  expect(run).toHaveBeenCalledTimes(1)
  refresh.trigger(); refresh.trigger()
  await drain()
  expect(run).toHaveBeenCalledTimes(1)
  finish(); await drain()
  expect(run).toHaveBeenCalledTimes(2)
  refresh.trigger(); refresh.dispose(); finish(); await drain()
  expect(run).toHaveBeenCalledTimes(2)
})
it('shares only same-user same-query in-flight reads and never stores a resolved result', async () => {
  let finish!: (value: string) => void
  const read = vi.fn(() => new Promise<string>(resolve => { finish = resolve }))
  const first = overviewRead('user-a:summary', read)
  expect(overviewRead('user-a:summary', read)).toBe(first)
  expect(await overviewRead('user-b:summary', async () => 'other user')).toBe('other user')
  await drain(); finish('a'); expect(await first).toBe('a'); await drain()
  expect(await overviewRead('user-a:summary', async () => 'fresh')).toBe('fresh')
  expect(read).toHaveBeenCalledTimes(1)
})
it('recovers from failures and cancels queued work on unmount', async () => {
  const error = vi.fn()
  const run = vi.fn().mockRejectedValue(new Error('offline'))
  const refresh = overviewRefresh(run, error)
  refresh.trigger(); await drain()
  expect(error).toHaveBeenCalledOnce()
  refresh.trigger(); refresh.dispose(); await drain()
  expect(run).toHaveBeenCalledOnce()
})
