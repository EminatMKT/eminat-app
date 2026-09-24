import type { I18nKey } from '@/shared/i18n'

const ONLY_ZEROS = /^0+(?:\.0*)?$/

/** What the editor says under the amount box, so unknown and zero never look alike. */
export default function amountHint(raw: string): I18nKey {
  const typed = raw.trim()
  if (!typed) return 'billing.amount.unknown'
  return ONLY_ZEROS.test(typed) ? 'billing.amount.zero' : 'billing.amount.set'
}

// `amount` is the one column that separates an unknown figure from a confirmed zero, and an empty
// box looks exactly like a zero on screen. This turns the raw text into the line that says which
// of the two is about to be stored — the reading Canva's own form got wrong by saving blank as 0.
