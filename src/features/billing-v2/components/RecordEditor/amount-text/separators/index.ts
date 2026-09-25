const SEPARATORS = { dot: '.', comma: ',', blanks: /\s+/g } as const

/** The characters an amount is typed with besides its digits: two separators and the blanks. */
export default SEPARATORS

// Either separator may be the decimal point, depending on who types: the amount normalizer
// decides which by position, and this file only names them. `\s` covers the no-break space a
// spreadsheet pastes between thousands.
