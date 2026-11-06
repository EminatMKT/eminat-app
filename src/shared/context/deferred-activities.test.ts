import { expect, it, vi } from 'vitest'
import { deferredActivities } from './deferred-activities'

it('does not scan the board on Meetings, restores the exact original read on another route, and shares pending resumes', async () => {
  let overview = true
  let finish!: (rows: string[]) => void
  const read = vi.fn(() => new Promise<string[]>(resolve => { finish = resolve }))
  const preload = deferredActivities(() => overview, read)
  expect(await preload.initial()).toBeNull()
  expect(read).not.toHaveBeenCalled()
  expect(await preload.resume()).toBeNull()
  overview = false
  const first = preload.resume()
  expect(preload.resume()).toBe(first)
  expect(read).toHaveBeenCalledOnce()
  finish(['unchanged full board'])
  expect(await first).toEqual(['unchanged full board'])
  preload.applied()
  expect(await preload.resume()).toBeNull()
})
it('retains a deferred result when navigation cancels its consumer, so the next module is not empty', async () => {
  let overview = true
  const read = vi.fn(async () => ['full board'])
  const preload = deferredActivities(() => overview, read)
  await preload.initial()
  overview = false
  await preload.resume()
  overview = true
  expect(await preload.resume()).toBeNull()
  overview = false
  expect(await preload.resume()).toEqual(['full board'])
  expect(read).toHaveBeenCalledOnce()
  preload.applied()
  expect(preload.needed()).toBe(false)
})
it('leaves every other route initial preload unchanged', async () => {
  const read = vi.fn(async () => ['same data'])
  const preload = deferredActivities(() => false, read)
  expect(await preload.initial()).toEqual(['same data'])
  expect(preload.needed()).toBe(false)
  expect(read).toHaveBeenCalledOnce()
})
