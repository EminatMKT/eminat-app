import { expect, it, vi } from 'vitest'
import now from '.'

const FROZEN_STAMP = '2026-11-09T10:15:00'

it('reads the current wall-clock time', () => {
  const frozen = new Date(FROZEN_STAMP)

  vi.useFakeTimers()
  vi.setSystemTime(frozen)

  const reading = now()

  vi.useRealTimers()

  expect(reading.getTime()).toBe(frozen.getTime())
})
