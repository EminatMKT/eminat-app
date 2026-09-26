import { test, expect } from '@playwright/test'
import pinToday from '../clock'
import { TODAY } from '../constants'

const SITE = 'http://clock.test/'
const PAGE = { status: 200, contentType: 'text/html', body: '<p>page</p>' }
const MINUTE_MS = 60_000
// How far apart two clocks of the same page may read and still be the same clock.
const SAME_CLOCK_MS = 250
// Time spent on the first page, which a faked clock would carry into the next.
const STAY_MS = 1000
const PARTS = { year: 2026, month: 0, day: 5 }
const ISO = '2026-01-05T10:00:00.000Z'

test.beforeEach(async ({ page }) => {
  await page.route(`${SITE}**`, (route) => route.fulfill(PAGE))
  await pinToday(page)
  await page.goto(SITE)
})

test('the page reads the pinned day, and its time runs from there', async ({ page }) => {
  const now = await page.evaluate(() => Date.now())
  expect(now).toBeGreaterThanOrEqual(TODAY.getTime())
  expect(now - TODAY.getTime()).toBeLessThan(MINUTE_MS)
  expect(await page.evaluate(() => new Date().getTime())).toBeGreaterThanOrEqual(now)
})

test('a date built from its parts or from a string is left alone', async ({ page }) => {
  const built = await page.evaluate(({ year, month, day, iso }) => {
    const fromParts = new Date(year, month, day)
    const report = { day: fromParts.getDate(), iso: new Date(iso).toISOString(), isDate: fromParts instanceof Date }
    return report
  }, { ...PARTS, iso: ISO })
  expect(built).toEqual({ day: PARTS.day, iso: ISO, isDate: true })
})

// A faked performance clock keeps counting across a reload while the document timeline restarts,
// and an animation started on the first lands in the second's future: the page never fades in.
test('after a reload, performance time still matches the document timeline', async ({ page }) => {
  await page.waitForTimeout(STAY_MS)
  await page.reload()
  const drift = await page.evaluate(() => Math.abs(performance.now() - Number(document.timeline.currentTime)))
  expect(drift).toBeLessThan(SAME_CLOCK_MS)
})
