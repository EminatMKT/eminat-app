import type { BillingV2Record } from '@/shared/data'
import values from '@/features/billing-v2/domain/record-values'

/** A payment's amount in its row's currency, or null when the amount is unknown. Only the two
 *  columns it is drawn from are asked for. */
export default function moneyText(
  { amount, currency_code }: Pick<BillingV2Record, 'amount' | 'currency_code'>, intlLocale: string,
): string | null {
  if (amount === null) return null
  const style = { style: 'currency', currency: currency_code ?? values.currency.enum.USD } as const
  return Number(amount).toLocaleString(intlLocale, style)
}

// The one place an amount turns into text. Null comes back as null and never as `$0.00`: the
// column exists to tell an unknown figure from a confirmed zero, and formatting both the same way
// would undo that on the screen after the database kept them apart.
//
// `Number` is safe here and nowhere else: the value only has to be drawn, not added or stored,
// and the schema bounds it to exact cents well inside what a double holds. The currency comes
// from the row; the fallback covers a payment read before the column was filled, and the figure
// the editor previews while it is typed, which has no row yet.
