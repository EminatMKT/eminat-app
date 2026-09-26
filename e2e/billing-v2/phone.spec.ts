import { test, expect, type Page } from '@playwright/test'
import { MODULE, modulePath } from '@/shared/auth/permissions'
import { BANNER, BUTTON, DIALOG, HEADING } from '@/shared/constants/dom'
import pinToday from './clock'
import expectOpaque from './opacity'
import geometry from './geometry'
import session from './session'
import screen from './screen'
import * as K from './constants'

// A phone the size most people carry: the page has to fit it without scrolling sideways.
const PHONE = { width: 390, height: 844 }
const PNG = 'image/png'
const SAVE = screen.say('billing.save')
const CANCEL = screen.say('common.cancel')
// The reason's fixed opening, before the list of missing fields is filled in.
const [HELD_BACK] = screen.say('billing.saveBlocked.missing').split('{')
// The space a field leaves under itself (0.875rem): the type pills owe the next label the same.
const FIELD_GAP_PX = 14

test.describe.configure({ mode: 'serial' })
session.install()
test.use({ viewport: PHONE })

/** What the screen shows, kept with the run so a person can look at what the numbers passed. */
async function keepPicture(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`)
  await page.screenshot({ path })
  await test.info().attach(name, { path, contentType: PNG })
}

/** Signs in on the pinned day and opens billing, answering with its heading once the page has
 *  faded in and the calendar is drawn. */
async function openBillingOnPhone(page: Page) {
  await pinToday(page)
  await session.loginAs(page, K.HOLDER_EMAIL)
  await page.goto(modulePath(MODULE.COBRANZAS))
  const heading = page.getByRole(HEADING, { level: 2, name: screen.title, exact: true })
  await expectOpaque(heading)
  await expect(screen.dayButton(page, 1).first()).toBeVisible()
  return heading
}

test('on a phone nothing of the page reaches past the screen, and the editor fits it', async ({ page }) => {
  const heading = await openBillingOnPhone(page)
  await keepPicture(page, 'billing-phone')
  expect(await geometry.pastTheEdge(heading)).toEqual([])
  await expect(page.getByRole(BANNER)).toBeInViewport({ ratio: 1 })

  await page.getByRole(BUTTON, { name: new RegExp(screen.say('billing.new')) }).click()
  const editor = page.getByRole(DIALOG)
  await expect(editor).toBeInViewport({ ratio: 1 })
  await keepPicture(page, 'billing-phone-editor')
  expect(await geometry.scrolledSideways(page)).toBe(0)

  const reason = await geometry.edges(editor.getByText(HELD_BACK))
  const save = await geometry.edges(editor.getByRole(BUTTON, { name: SAVE, exact: true }))
  const cancel = await geometry.edges(editor.getByRole(BUTTON, { name: CANCEL, exact: true }))
  const frame = await geometry.edges(editor)
  expect(reason.bottom).toBeLessThanOrEqual(Math.min(save.top, cancel.top))
  expect(reason.right - reason.left).toBeGreaterThanOrEqual(save.right - cancel.left)
  expect([reason.left >= frame.left, reason.right <= frame.right, reason.spills]).toEqual([true, true, false])

  const pill = await geometry.edges(editor.getByRole(BUTTON, { name: screen.say('billing.type.payment'), exact: true }))
  const label = await geometry.edges(editor.getByText(screen.say('billing.field.scheduledOn'), { exact: true }))
  expect(label.top - pill.bottom).toBeGreaterThanOrEqual(FIELD_GAP_PX)
})

// The phone check the 25/09 pass could not do (a maximized window would not resize). The page is
// reached by address, since the rail folds behind a menu here. On a phone the reason Save is held
// sits above the buttons across the footer; the pills keep a field's gap before the next label.
