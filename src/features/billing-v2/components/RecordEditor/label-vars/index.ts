import values from '@/features/billing-v2/domain/record-values'

const [currency] = values.currency.options

const LABEL_VARS = { currency }

/** What the field labels interpolate: the currency the amount is typed in, from the domain. */
export default LABEL_VARS

// Every billing amount is stored in the one currency the domain declares, and the amount box
// says which while it is being typed —«Monto (USD)»— instead of leaving it to the calendar to
// reveal afterwards. The code comes from the domain enum, so a second currency is a change there
// and not a hunt for a hardcoded «USD».
