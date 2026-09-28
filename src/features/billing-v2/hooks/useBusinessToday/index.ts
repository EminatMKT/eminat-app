'use client'
import { useEffect, useState } from 'react'
import businessDay from '@/features/billing-v2/domain/business-day'
import watchDay from './watch-day'

/** Today on the billing business calendar, refreshed when the day turns or the app resumes. */
export default function useBusinessToday(): string {
  const [today, setToday] = useState(() => businessDay.today())
  useEffect(() => watchDay(setToday, document), [])
  return today
}

// The date the reminder lists split on. It re-renders once a day at most: `watchDay` wakes up at
// the next business midnight and when the page comes back into view, and setting the same string
// twice is a no-op for React. The second-ticking `useClock` is deliberately not used — a clock
// that changes every second would redraw the whole calendar every second to move nothing.
