import type { I18nKey } from '@/shared/i18n'
import billingAmount from '@/features/billing-v2/domain/amount-schema'

const ONLY_ZEROS = /^0+(?:\.0*)?$/

/** What the editor says under the amount box, so unknown and zero never look alike — or null
 *  when the figure cannot be stored, since then nothing is about to be saved. */
export default function amountHint(raw: string): I18nKey | null {
  const typed = raw.trim()
  if (!typed) return 'billing.amount.unknown'
  if (!billingAmount.safeParse(typed).success) return null
  return ONLY_ZEROS.test(typed) ? 'billing.amount.zero' : 'billing.amount.set'
}

// `amount` is the one column that separates an unknown figure from a confirmed zero, and an empty
// box looks exactly like a zero on screen. This turns the normalized text into the line that says
// which of the two is about to be stored — the reading Canva's own form got wrong by saving blank
// as 0. A figure the schema refuses gets no line: «Se guarda abc» would promise a save that Save
// is holding back, and the reason beside Save already names the box to fix.
