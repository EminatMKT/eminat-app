import { z } from 'zod'

const EXACT_CENTS = /^\d+(?:\.\d\d?0*)?$/
const MAX_WHOLE_DIGITS = 12

function withinRange(value: string): boolean {
  const whole = value.split('.')[0] ?? ''
  return whole.replace(/^0+(?=\d)/, '').length <= MAX_WHOLE_DIGITS
}

const billingAmount = z.string().regex(EXACT_CENTS).refine(withinRange).nullable()

/** A billing amount as it crosses the wire: a decimal string, or null for an unknown one. */
export default billingAmount

// Validates the amount as TEXT and never as a number, because no float holds every cent and
// this is the field that decides what somebody gets paid. `z.string()` is what rejects a JS
// number, NaN and the infinities; the pattern is what rejects the sign, so every negative
// including -0.004 is gone before any arithmetic could round it into a valid zero. Digits
// past the second decimal are admitted only while they are zeros, which is why 1.2300 is a
// whole number of cents and 1.005 is not. The ceiling is counted in significant whole digits
// so that leading zeros neither inflate nor shrink the amount. null stays null: an unknown
// amount and an explicit zero are different facts and nothing here may merge them.
