import { expect, it } from 'vitest'
import { meetingDisplayCopy } from './display-copy'

it('updates legacy branding only for display without mutating history', () => {
  const historicalEvent = { summary: 'StratixCRM enlazado desde Stratix Meet', id: 'untouched', created_at: '2026-01-01' }
  const before = { ...historicalEvent }
  expect(meetingDisplayCopy(historicalEvent.summary)).toBe('LILLY enlazado desde Meetings')
  expect(historicalEvent).toEqual(before)
})
