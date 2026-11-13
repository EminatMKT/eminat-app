import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { GesturePointerEvent } from '../types'
import abortGesture from '.'

type StubActive = { pointerId: number }

const buildEvent = (pointerId: number): GesturePointerEvent => ({
  pointerId,
  clientY: 0,
  currentTarget: { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() },
})

describe('abortGesture', () => {
  it('clears the active gesture when the pointer matches', () => {
    const state: { active: StubActive | null } = { active: { pointerId: 1 } }

    abortGesture(state, buildEvent(1))

    expect(state.active).toBeNull()
  })

  it('leaves a different pointer untouched', () => {
    const active: StubActive = { pointerId: 1 }
    const state: { active: StubActive | null } = { active }

    abortGesture(state, buildEvent(2))

    expect(state.active).toBe(active)
  })

  it('is a no-op when no gesture is active', () => {
    const state: { active: StubActive | null } = { active: null }

    expect(() => abortGesture(state, buildEvent(1))).not.toThrow()
  })
})
