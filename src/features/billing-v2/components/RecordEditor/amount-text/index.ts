import SEPARATORS from './separators'

const { dot, comma, blanks, currency } = SEPARATORS

/** A whole part written in groups of three: 1-3 leading digits that do not start with zero. */
const grouped = (sep: string) => new RegExp(`^[1-9]\\d{0,2}(?:\\${sep}\\d{3})+$`)

function ungroup(whole: string, sep: string): string | null {
  return grouped(sep).test(whole) ? whole.split(sep).join('') : null
}

/** Both separators typed: the last one is the decimal point, the other groups thousands. */
function bothSeparators(text: string): string {
  const point = text.lastIndexOf(dot) > text.lastIndexOf(comma) ? dot : comma
  const thousands = point === dot ? comma : dot
  const at = text.lastIndexOf(point)
  const whole = ungroup(text.slice(0, at), thousands)
  return whole === null ? text : `${whole}${dot}${text.slice(at + 1)}`
}

/** One kind of separator: thousands when it groups the number in threes, the decimal otherwise. */
function oneSeparator(text: string, sep: string): string {
  const whole = ungroup(text, sep)
  if (whole !== null) return whole
  const parts = text.split(sep)
  return parts.length === 2 ? parts.join(dot) : text
}

/** What the person typed in the amount box, rewritten into the text the domain schema reads. */
export default function amountText(typed: string): string {
  const unspaced = typed.replace(blanks, '')
  const text = unspaced.replace(currency, '')
  const hasDot = text.includes(dot)
  const hasComma = text.includes(comma)
  if (hasDot && hasComma) return bothSeparators(text)
  if (hasComma) return oneSeparator(text, comma)
  if (hasDot) return oneSeparator(text, dot)
  return text
}

// The field accepts what the person types, and this is where it is normalized, before the domain
// schema — which stays strict because it mirrors the database CHECK. Spaces go, whatever kind,
// and so does a currency mark at either end (`$150`, `150 USD`): it names the money, not the figure.
// A comma or a dot may be the decimal point: with both typed, the last one is, and the other has
// to group the whole part in threes. With only one kind, it is a thousands separator when it groups
// the number in threes —1-3 leading digits that do not start with zero, then groups of exactly
// three— and the decimal point otherwise.
//
// That settles the ambiguous «1.250» as one thousand two hundred and fifty, as it is read in
// es-EC, where this screen is used; nobody types a payment to the tenth of a cent, so the other
// reading (1.25) was never a real amount. «1250.405» is not grouped —four leading digits— so it
// stays a decimal and the schema refuses the third decimal instead of this file inventing a
// thousand. Anything it cannot read comes back unchanged, so the schema refuses it and the person
// is told the format; a sign is never touched, because a negative amount is refused, not fixed.
