/** A decimal string's cents as an integer, read once — never a running float total (see
 *  `money-text`'s own comment: `Number` is safe for drawing ONE amount, not for adding many). */
export default function toCents(amount: string): number {
  const [whole, decimals = ''] = amount.split('.')
  const cents = `${decimals}00`.slice(0, 2)
  return Number(whole) * 100 + Number(cents)
}

// Shared by `billing-overview` and `billing-breakdown`: both tally payments by their dollar
// amount, and this is the one place a decimal string turns into cents.
