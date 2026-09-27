const SEPARATORS = { dot: '.', comma: ',', blanks: /\s+/g, currency: /^(?:\$|usd)|(?:\$|usd)$/gi } as const

/** The characters an amount is typed with besides its digits: two separators, the blanks, and
 *  the currency mark written before or after the figure. */
export default SEPARATORS

// Either separator may be the decimal point, depending on who types: the amount normalizer
// decides which by position, and this file only names them. `\s` covers the no-break space a
// spreadsheet pastes between thousands. The currency mark is matched once at each end, after the
// blanks are gone: `$150`, `150 USD` and `$ 1.250,40` are money as people write it, while a second
// `$` or one in the middle stays in the text for the schema to refuse.
