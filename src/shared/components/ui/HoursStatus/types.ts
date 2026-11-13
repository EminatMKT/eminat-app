/** How a declared value compares against an expected one. */
export type HoursStatusTone = 'below' | 'complete' | 'above' | 'unavailable'

/** Props for a short symbol+text comparison, colored by `tone`. */
export type HoursStatusProps = {
  symbol: string
  text: string
  tone: HoursStatusTone
}
