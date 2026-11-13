import { expect, it, vi } from 'vitest'
import { NOW_TICK_MS } from './constants'
import startTicking from '.'

const ONE_MINUTE_MS = 60_000

it('reads the clock at once and then once a minute', () => {
  const onTick = vi.fn()

  vi.useFakeTimers()
  const stop = startTicking(onTick)

  vi.advanceTimersByTime(ONE_MINUTE_MS)
  const ticksAfterOneMinute = onTick.mock.calls.length

  stop()
  vi.useRealTimers()

  expect(NOW_TICK_MS).toBe(ONE_MINUTE_MS)
  expect(ticksAfterOneMinute).toBe(2)
})

it('stops ticking once the returned cleanup runs', () => {
  const onTick = vi.fn()

  vi.useFakeTimers()
  const stop = startTicking(onTick)

  stop()
  vi.advanceTimersByTime(ONE_MINUTE_MS)
  vi.useRealTimers()

  expect(onTick).toHaveBeenCalledTimes(1)
})
