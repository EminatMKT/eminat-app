import { describe, expect, it } from 'vitest'
import compareDailyHours from '.'

describe('compareDailyHours', () => {
  it('reports how far a day sits from its jornada reference', () => {
    const shortfall = compareDailyHours(5, 9)
    expect(shortfall.differenceHours).toBe(-4)
    expect(shortfall.status).toBe('below')

    const surplus = compareDailyHours(9, 6)
    expect(surplus.differenceHours).toBe(3)
    expect(surplus.status).toBe('above')
  })

  it('reports unavailable, not a shortfall, when the day has no jornada reference', () => {
    const noReference = compareDailyHours(5, null)
    expect(noReference.status).toBe('unavailable')
    expect(noReference.differenceHours).toBeNull()
  })
})
