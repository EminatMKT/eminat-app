import businessDay from '@/features/billing-v2/domain/business-day'

/** The slice of `document` this needs, narrow enough for a test to hand in a fake. */
type Page = {
  visibilityState: DocumentVisibilityState
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
}

const VISIBILITY = 'visibilitychange'
const VISIBLE = 'visible'

/** Calls `onDay` with the business day when it turns and when the page comes back into view.
 *  Returns the function that stops both. */
export default function watchDay(onDay: (day: string) => void, page: Page): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const read = () => {
    clearTimeout(timer)
    timer = setTimeout(read, businessDay.msUntilNext())
    onDay(businessDay.today())
  }
  const arm = () => { timer = setTimeout(read, businessDay.msUntilNext()) }
  const onVisibility = () => { if (page.visibilityState === VISIBLE) read() }
  arm()
  page.addEventListener(VISIBILITY, onVisibility)
  return () => {
    clearTimeout(timer)
    page.removeEventListener(VISIBILITY, onVisibility)
  }
}

// When "today" has to be read again, and nothing more often. One timer is set for the next
// business midnight and re-armed each time it fires; the screen never ticks every second.
//
// The timer alone is not enough: a laptop that sleeps through midnight, or a background tab the
// browser throttles, wakes up late with yesterday's split between Overdue and Upcoming. Coming
// back into view re-reads the day and re-arms the timer, which covers both. A hide is ignored.
//
// It takes the page as an argument so the behaviour runs in tests without a DOM.
