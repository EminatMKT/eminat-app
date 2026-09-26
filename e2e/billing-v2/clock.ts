import type { Page } from '@playwright/test'
import { TODAY } from './constants'

/** Runs in the page before its own scripts: moves the calendar by `shift` and nothing else. */
function shiftCalendar(shift: number) {
  const RealDate = Date
  const realNow = RealDate.now.bind(RealDate)
  RealDate.now = () => realNow() + shift
  window.Date = new Proxy(RealDate, {
    construct(target, args, newTarget) {
      const when = args.length ? args : [target.now()]
      return Reflect.construct(target, when, newTarget)
    },
    apply(target) {
      const today = new target(target.now())
      return today.toString()
    },
  })
}

/** Makes the page's calendar read TODAY from now on, with its time running from there. */
export default async function pinToday(page: Page) {
  await page.addInitScript(shiftCalendar, TODAY.getTime() - Date.now())
}

// Not Playwright's clock: it also fakes `performance.now()`, which keeps counting across a reload
// while the document timeline restarts, so framer-motion's fade starts in the future (opacity 0).
// The shift is taken once, here, so the time runs on across reloads instead of starting over.
