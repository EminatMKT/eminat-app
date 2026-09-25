import { parseISO } from 'date-fns'

const STYLES = {
  month: { month: 'long', year: 'numeric' },
  day: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  number: { day: 'numeric' },
} as const

/** What an ISO date-only string says out loud in `locale`: the month page it belongs to, the
 *  whole day, and the bare number a cell draws. */
export default function dateLabel(iso: string, locale: string) {
  const date = parseISO(iso)
  const said = {
    month: date.toLocaleDateString(locale, STYLES.month),
    day: date.toLocaleDateString(locale, STYLES.day),
    number: date.toLocaleDateString(locale, STYLES.number),
  }
  return said
}

// The words of the calendar, in one place. The three readings come back together instead of
// being picked by a style argument: the name of a reading is a domain value, and a domain value
// written into the call is one nobody checks (`argumento_literal`).
//
// They share the trap that makes this a unit at all: the string has to become a Date in the
// calendar of whoever is looking. `parseISO` does that — `new Date('2026-09-01')` reads the
// string as UTC and lands on August 31st anywhere west of Greenwich.
