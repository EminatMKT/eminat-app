import { test, expect, type Locator, type Page } from '@playwright/test'
import { MODULE, modulePath } from '@/shared/auth/permissions'
import { BUTTON, DIALOG, HEADING } from '@/shared/constants/dom'
import session from './session'
import screen from './screen'
import * as K from './constants'

// A phone the size most people carry: the page has to fit it without scrolling sideways.
const PHONE = { width: 390, height: 844 }
const PNG = 'image/png'
// Only for the picture: the page fades in, and a shot taken during the fade shows it blank.
const PAGE_FADE_MS = 1000
// Every month has a first day, so its button is drawn whatever month the real clock is in.
const FIRST_DAY = 1

test.describe.configure({ mode: 'serial' })
session.install()
test.use({ viewport: PHONE })

/** Every visible element of billing's page that reaches past the right edge of the screen. The
 *  page is the box that holds its heading's row; the shell's topbar is shared by every module
 *  and has no landmark to leave out, so it is measured apart, not here. */
function pastTheEdge(heading: Locator) {
  return heading.evaluate((title) => {
    const edge = window.innerWidth
    const offenders: string[] = []
    const page = title.parentElement?.parentElement
    for (const element of Array.from(page?.querySelectorAll('*') ?? [])) {
      const box = element.getBoundingClientRect()
      const shown = box.width > 0 && box.height > 0
      if (shown && box.right > edge + 1) offenders.push(`${element.tagName.toLowerCase()}.${element.className} → ${Math.round(box.right)}`)
    }
    return offenders
  })
}

/** How far the window itself has been scrolled sideways. */
function scrolledSideways(page: Page) {
  return page.evaluate(() => window.scrollX)
}

/** What the screen shows, kept with the run so a person can look at what the numbers passed. */
async function keepPicture(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`)
  await page.screenshot({ path })
  await test.info().attach(name, { path, contentType: PNG })
}

/** Signs in and opens billing, answering with the page's heading once the calendar is drawn. The
 *  clock is NOT frozen here: a frozen clock stalls the page's fade-in at opacity 0, and a
 *  picture of an invisible page proves nothing. */
async function openBillingOnPhone(page: Page) {
  await session.loginAs(page, K.HOLDER_EMAIL)
  await page.goto(modulePath(MODULE.COBRANZAS))
  const heading = page.getByRole(HEADING, { level: 2, name: screen.title, exact: true })
  await expect(heading).toBeInViewport()
  await expect(screen.dayButton(page, FIRST_DAY).first()).toBeVisible()
  return heading
}

test('on a phone nothing of the page reaches past the screen, and the editor fits it', async ({ page }) => {
  const heading = await openBillingOnPhone(page)
  await page.waitForTimeout(PAGE_FADE_MS)
  await keepPicture(page, 'billing-phone')
  expect(await pastTheEdge(heading)).toEqual([])

  await page.getByRole(BUTTON, { name: new RegExp(screen.say('billing.new')) }).click()
  const editor = page.getByRole(DIALOG)
  await expect(editor).toBeInViewport({ ratio: 1 })
  await keepPicture(page, 'billing-phone-editor')
  expect(await scrolledSideways(page)).toBe(0)
})

// The phone check the 25/09 pass could not do (a maximized window would not resize). It lists
// every element past the edge, because an `overflow: hidden` ancestor hides it from the page's
// scroll width; the page is reached by address, since the rail folds behind a menu here.
