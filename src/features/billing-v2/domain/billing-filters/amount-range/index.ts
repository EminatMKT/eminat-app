import { RANGE_SEP } from '@/shared/utils'
import toCents from '@/features/billing-v2/domain/to-cents'

const DECIMAL_AMOUNT = /^\d+(\.\d{1,2})?$/

function centsFor(amount: string): number | null {
  if (!DECIMAL_AMOUNT.test(amount)) return null
  return toCents(amount)
}

function validBound(value: string): boolean {
  return value === '' || DECIMAL_AMOUNT.test(value)
}

/** Does the stored amount fall inside the decimal `"from..to"` range? */
export default function inAmountRange(value: string, amount: string | null): boolean {
  if (amount == null) return false
  const current = centsFor(amount)
  if (current == null) return false
  const parts = value.split(RANGE_SEP)
  const [start = '', end = ''] = parts
  const rangeShape = parts.length === 2
  const hasBound = start !== '' || end !== ''
  const validStart = validBound(start)
  const validEnd = validBound(end)
  const validRange = rangeShape && hasBound && validStart && validEnd
  if (!validRange) return false
  const min = start ? centsFor(start) : null
  const max = end ? centsFor(end) : null
  const passesMin = min == null || current >= min
  const passesMax = max == null || current <= max
  return passesMin && passesMax
}

// Like the date range, this stays as a string so saved views keep using `FilterValues`. Unlike
// dates, an unknown amount stays out: "unknown" is not between two numbers.
