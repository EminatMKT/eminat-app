import { describe, it, expect, vi, afterEach } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import fadeTimer from './index'

const LIFE_MS = 4000
const shown: (I18nKey | null)[] = []
const show = (key: I18nKey | null) => { shown.push(key) }

describe('fadeTimer', () => {
  afterEach(() => { vi.useRealTimers(); shown.length = 0 })

  // A confirmation is said and then goes by itself; nobody has to close it.
  it('shows the line and clears it once its time is up', () => {
    vi.useFakeTimers()
    fadeTimer(show, LIFE_MS).say('billing.saved')
    vi.advanceTimersByTime(LIFE_MS - 1)
    expect(shown).toEqual(['billing.saved'])
    vi.advanceTimersByTime(1)
    expect(shown).toEqual(['billing.saved', null])
  })

  // A second write within the time replaces the first line and gets its whole time again.
  it('gives a new line its whole time, and never clears it with the old timer', () => {
    vi.useFakeTimers()
    const timer = fadeTimer(show, LIFE_MS)
    timer.say('billing.saved')
    vi.advanceTimersByTime(LIFE_MS - 1)
    timer.say('billing.deleted')
    vi.advanceTimersByTime(LIFE_MS - 1)
    expect(shown).toEqual(['billing.saved', 'billing.deleted'])
  })

  it('clears nothing more once it is stopped', () => {
    vi.useFakeTimers()
    const timer = fadeTimer(show, LIFE_MS)
    timer.say('billing.saved')
    timer.stop()
    vi.advanceTimersByTime(LIFE_MS)
    expect(shown).toEqual(['billing.saved'])
  })
})
