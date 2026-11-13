'use client'
import { useEffect, useState } from 'react'
import startTicking from './start-ticking'

/** The current time, refreshed once a minute. Null on the server and the first client render, so
 *  the server markup and the hydrated markup agree; the clock is read only after mount. */
export default function useNow(): Date | null {
  const [current, setCurrent] = useState<Date | null>(null)

  useEffect(() => startTicking(setCurrent), [])

  return current
}

// Not the shared useClock: that one formats a string every second; the grid needs a Date a minute.
