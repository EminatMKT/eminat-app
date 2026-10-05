import { describe, expect, it } from 'vitest'
import normalizeResponsibles from './normalize'

const anaId = '22222222-2222-4222-8222-222222222222'
const betoId = '33333333-3333-4333-8333-333333333333'

describe('normalizeResponsibles', () => {
  it('turns the legacy single id into a one-item set without leader', () => {
    const legacy = { responsable_id: anaId }
    expect(normalizeResponsibles(legacy)).toEqual({ ids: [anaId], leaderId: null })
  })

  it('deduplicates the array and keeps the leader', () => {
    const request = { responsable_ids: [anaId, betoId, anaId], lider_id: betoId }
    expect(normalizeResponsibles(request)).toEqual({ ids: [anaId, betoId], leaderId: betoId })
  })

  it('keeps an explicit empty array: it clears the set', () => {
    const clear = { responsable_ids: [] }
    expect(normalizeResponsibles(clear)).toEqual({ ids: [], leaderId: null })
  })

  it('answers null when the request does not touch responsibles', () => {
    const untouched = {}
    expect(normalizeResponsibles(untouched)).toBeNull()
  })
})
