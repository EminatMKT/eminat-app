import { useState } from 'react'
import { parseISO, startOfMonth } from 'date-fns'
import { localDate } from '@/shared/utils'

/** The calendar month on screen, starting on the month `today` falls in. */
export default function useCalendarPeriod(today: string) {
  return useState(() => localDate(startOfMonth(parseISO(today))))
}

// Split out of `BillingV2Content` so that file keeps a single `useState` of its own — this
// one and the editor's are unrelated concerns, and this repo caps direct `useState` calls at one
// per file rather than forcing two unrelated pieces of state into one object.
