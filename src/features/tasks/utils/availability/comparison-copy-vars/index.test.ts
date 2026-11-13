import { describe, expect, it } from 'vitest'
import compareDailyHours from '../compare-daily-hours'
import comparisonCopyVars from '.'

const DECLARED_HOURS = 5
const EXPECTED_HOURS = 9
const SHORTFALL_HOURS = 4
const NO_JORNADA = null
const NO_HOURS = 0

describe('comparisonCopyVars', () => {
  it('reports the absolute hour difference against the jornada', () => {
    const shortfall = compareDailyHours(DECLARED_HOURS, EXPECTED_HOURS)
    const vars = comparisonCopyVars(shortfall)

    expect(vars.declared).toBe(DECLARED_HOURS)
    expect(vars.expected).toBe(EXPECTED_HOURS)
    expect(vars.difference).toBe(SHORTFALL_HOURS)
  })

  it('falls back to zero when the day has no jornada reference', () => {
    const noReference = compareDailyHours(DECLARED_HOURS, NO_JORNADA)
    const vars = comparisonCopyVars(noReference)

    expect(vars.expected).toBe(NO_HOURS)
    expect(vars.difference).toBe(NO_HOURS)
  })
})
