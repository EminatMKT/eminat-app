import { test, expect } from '@playwright/test'
import type { Page, Response, Locator } from '@playwright/test'
import { ADMIN_ROLE } from '@/shared/auth/permissions'
import { AVAILABILITY_ENDPOINT } from '@/features/tasks/data/availability/constants'
import { PIXELS_PER_MINUTE } from
  '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import {
  BUTTON,
  DIALOG,
  ENTER,
  ESCAPE,
} from '@/shared/constants/dom'
import {
  PASSWORD,
  ensureUser,
  getUsuario,
  deleteUser,
  H,
} from '../seed'
import { URL } from '../constants'
import assignOrganization from '../availability-seed/assign-organization'
import clearWeeklyAvailability from '../availability-seed/clear-weekly-availability'
import firstDepartamentoId from '../availability-seed/first-departamento-id'
import firstActiveJornada from '../availability-seed/first-active-jornada'

const TASKS_ROLE = 'stratix360'
const SURNAME = 'AvailJourneye2e'
const OWNER_EMAIL = 'owner.availability.journey.e2e@eminat.net'
const TEAMMATE_EMAIL = 'teammate.availability.journey.e2e@eminat.net'
const ADMIN_EMAIL = 'admin.availability.journey.e2e@eminat.net'
const TEAM_CODE = 'E2E_AVAIL_JOURNEY_TEAM'
const HOME_URL = 'http://localhost:3000/'
const LOGIN_WAIT = { timeout: 40000 }
// Reused verbatim from e2e/billing-v2/phone.spec.ts's PHONE / e2e/meetings-synthetic.spec.ts;
// this repo has no single exported narrow-viewport constant to import instead.
const NARROW_VIEWPORT_WIDTH = 390
const NARROW_VIEWPORT_HEIGHT = 844
const NARROW_VIEWPORT = { width: NARROW_VIEWPORT_WIDTH, height: NARROW_VIEWPORT_HEIGHT }
// Matches e2e/native-sales.spec.ts's own overflow check: a 1px tolerance absorbs scrollbar
// rounding so the assertion does not flake on a pixel that is not real overflow.
const OVERFLOW_TOLERANCE_PX = 1
// This journey drives drag-create, an edge-resize, a popover edit, a delete, a real save
// round-trip, a reload, and a keyboard-only pass -- comfortably past Playwright's 60s default
// once the dev server is also compiling routes on first hit.
const TEST_TIMEOUT_MS = 120000
const ALERT_DIALOG_ROLE = 'alertdialog'
const SPACE_KEY = ' '
const PUT_METHOD = 'PUT'
const TUESDAY_LABEL = 'Tuesday'
const WEDNESDAY_LABEL = 'Wednesday'
const THURSDAY_LABEL = 'Thursday'
const TUESDAY_START_LABEL = 'Tuesday start time'
const TUESDAY_END_LABEL = 'Tuesday end time'
const TUESDAY_NOTE_LABEL = 'Tuesday note'
const DRAG_NOTE_TEXT = 'Team sync'
const EDITED_NOTE_TEXT = 'Rescheduled'
const DELETE_LABEL = 'Delete'
const SAVE_CHANGES_LABEL = 'Save changes'
const SAVE_AVAILABILITY_LABEL = 'Save availability'
const NO_JORNADA_NOTICE = 'No workday assigned: an admin has to assign one in Admin before availability can be declared.'
const TUESDAY_START_VALUE = '06:00'
const TUESDAY_END_VALUE = '07:30'
// Kept inside the default 1280x720 viewport's visible height without scrolling: the track
// spans the full 24h day (1080px tall) starting at the modal's current scroll offset, so a
// drag target past roughly minute 520 lands below the fold and never reaches the real DOM.
const DRAG_START_MINUTE = 370
const DRAG_END_MINUTE = 410
const RESIZE_TARGET_MINUTE = 450
const RESIZE_HANDLE_XPATH = 'xpath=following-sibling::div[@data-resize-handle="true"]'
const GRID_DAY_SELECTOR = '[data-grid-day]'
const GRID_TRACK_SELECTOR = '[data-grid-track]'
const MOVE_OPTIONS = { steps: 5 }
const TUESDAY_BLOCK_START_PATTERN = /^06:00–/
const EDIT_RANGE_SUFFIX_PATTERN = /\. Edit range$/
const TUESDAY_FINAL_TIME_TEXT = '06:00–07:30'
const MISSING_BOX_ERROR = 'Expected a bounding box for this element'
// Kept inside the same visible-without-scrolling range as the other minute offsets above.
const THURSDAY_CLICK_MINUTE = 300
// A track's own tab stop, the keyboard-create affordance that replaced the add-range button.
const FOCUSABLE_TRACK_SELECTOR = '[data-grid-track][tabindex="0"]'

async function ensureTeam(codigo: string, nombre: string, departamentoId: string): Promise<string> {
  const insertUrl = `${URL}/rest/v1/equipos?on_conflict=codigo`
  const teamBody = { codigo, nombre, departamento_id: departamentoId }
  const insertInit = {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(teamBody),
  }

  const response = await fetch(insertUrl, insertInit)

  if (!response.ok) throw new Error(`ensureTeam ${codigo}: ${response.status} ${await response.text()}`)

  const rows = await response.json()

  return rows[0].id
}

async function deleteTeam(codigo: string): Promise<void> {
  const deleteUrl = `${URL}/rest/v1/equipos?codigo=eq.${codigo}`
  const deleteInit = { method: 'DELETE', headers: H }

  await fetch(deleteUrl, deleteInit)
}

// Fresh test users never completed the first-visit tour; its full-screen mask would intercept
// sidebar clicks. The default locale is Spanish (see src/shared/i18n/constants.ts) unless
// localStorage says otherwise -- matches e2e/native-sales.spec.ts's exact init pattern.
async function bypassOnboardingAndForceEnglish(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('eminat-onboarding-completed', 'true')
    localStorage.setItem('locale', 'en')
  })
}

async function login(page: Page, email: string): Promise<void> {
  // The middleware redirects an authenticated session straight back to '/' on '/login'
  // (src/middleware.ts: `hasSession && pathname === '/login'`); this test logs in twice as
  // different identities on the same page, so the prior session's cookie has to go first.
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByPlaceholder('tu@eminat.net').fill(email)

  const password = page.locator('input[type="password"]')

  await password.fill(PASSWORD)
  await password.press('Enter')
  await page.waitForURL(HOME_URL, LOGIN_WAIT)
}

// Both sub-nav buttons prefix their label with an un-hidden emoji glyph (no space, no
// aria-hidden), unlike the shared Button component's icon -- so the accessible name is not
// exactly 'Requests'/'Availability'. Matches billing-v2/screen.ts's own tab-button pattern.
async function openAvailability(page: Page): Promise<void> {
  const requestsTabMatcher = { name: /Requests/ }
  const availabilityTabMatcher = { name: /Availability/ }

  await page.goto('/tasks')
  await page.getByRole('button', requestsTabMatcher).click()
  await page.getByRole('button', availabilityTabMatcher).click()
}

// Each card is now the single full-card press target (`Pressable`), named "Open {name}'s weekly
// schedule" for a read-only teammate card, or "Edit {name}'s weekly schedule" for the viewer's
// own card -- the modal is what used to be the inline "Edit" swap, so opening a card is the new
// entry point for both reading and editing a schedule.
function cardFor(page: Page, name: string) {
  const nameFilter = { name: new RegExp(`(?:Open|Edit) ${name}`) }

  return page.getByRole('button', nameFilter)
}

const OWNER_CARD_NAME = `Owner ${SURNAME}`
const TEAMMATE_CARD_NAME = `Teammate ${SURNAME}`
const ADMIN_CARD_NAME = `Admin ${SURNAME}`

type DragBox = {
  x: number
  y: number
  width: number
  height: number
}

async function boxOf(locator: Locator): Promise<DragBox> {
  const box = await locator.boundingBox()

  if (!box) throw new Error(MISSING_BOX_ERROR)

  return box
}

async function dragFromTo(
  { mouse }: Page,
  { x, y }: Pick<DragBox, 'x' | 'y'>,
  toY: number,
): Promise<void> {
  await mouse.move(x, y)
  await mouse.down()
  await mouse.move(x, toY, MOVE_OPTIONS)
  await mouse.up()
}

function roleButton(scope: Page | Locator, name: string | RegExp): Locator {
  const matcher = { name }

  return scope.getByRole(BUTTON, matcher)
}

function namedDialog(page: Page, name: string): Locator {
  const matcher = { name }

  return page.getByRole(DIALOG, matcher)
}

function namedAlertDialog(page: Page, name: string): Locator {
  const matcher = { name }

  return page.getByRole(ALERT_DIALOG_ROLE, matcher)
}

function dayTrack(page: Page, dayLabel: string): Locator {
  const filterOptions = { hasText: dayLabel }

  return page.locator(GRID_DAY_SELECTOR).filter(filterOptions).locator(GRID_TRACK_SELECTOR)
}

function tuesdayTrack(page: Page): Locator {
  return dayTrack(page, TUESDAY_LABEL)
}

function wednesdayTrack(page: Page): Locator {
  return dayTrack(page, WEDNESDAY_LABEL)
}

function tuesdayBlock(page: Page): Locator {
  return roleButton(page, TUESDAY_BLOCK_START_PATTERN)
}

function resizeHandles(block: Locator): Locator {
  return block.locator(RESIZE_HANDLE_XPATH)
}

function thursdayTrack(page: Page): Locator {
  return dayTrack(page, THURSDAY_LABEL)
}

function wednesdayBlock(page: Page): Locator {
  const filterOptions = { hasText: WEDNESDAY_LABEL }
  const dayColumn = page.locator(GRID_DAY_SELECTOR).filter(filterOptions)

  return roleButton(dayColumn, EDIT_RANGE_SUFFIX_PATTERN)
}

async function dragCreateTuesdayRange(page: Page): Promise<void> {
  const trackBox = await boxOf(tuesdayTrack(page))
  const x = trackBox.x + trackBox.width / 2
  const startPoint = { x, y: trackBox.y + DRAG_START_MINUTE * PIXELS_PER_MINUTE }
  const endY = trackBox.y + DRAG_END_MINUTE * PIXELS_PER_MINUTE

  await dragFromTo(page, startPoint, endY)
}

async function fillCreatedTuesdayRange(page: Page): Promise<void> {
  const popover = namedDialog(page, TUESDAY_LABEL)

  await popover.getByLabel(TUESDAY_NOTE_LABEL).fill(DRAG_NOTE_TEXT)
  await roleButton(popover, SAVE_CHANGES_LABEL).click()
  await expect(popover).toBeHidden()
}

async function resizeTuesdayBlockEnd(page: Page): Promise<void> {
  const trackBox = await boxOf(tuesdayTrack(page))
  const handleBox = await boxOf(resizeHandles(tuesdayBlock(page)).last())
  const startPoint = { x: handleBox.x + handleBox.width / 2, y: handleBox.y + handleBox.height / 2 }
  const endY = trackBox.y + RESIZE_TARGET_MINUTE * PIXELS_PER_MINUTE

  await dragFromTo(page, startPoint, endY)
}

async function editTuesdayNote(page: Page): Promise<void> {
  await tuesdayBlock(page).click()
  const popover = namedDialog(page, TUESDAY_LABEL)

  await popover.getByLabel(TUESDAY_NOTE_LABEL).fill(EDITED_NOTE_TEXT)
  await roleButton(popover, SAVE_CHANGES_LABEL).click()
  await expect(popover).toBeHidden()
}

async function confirmDelete(scope: Locator): Promise<void> {
  await roleButton(scope, DELETE_LABEL).click()
  const confirm = namedAlertDialog(scope.page(), DELETE_LABEL)

  await roleButton(confirm, DELETE_LABEL).click()
  await expect(confirm).toBeHidden()
}

async function createAndDeleteThursdayRange(page: Page): Promise<void> {
  const trackBox = await boxOf(thursdayTrack(page))
  const x = trackBox.x + trackBox.width / 2
  const y = trackBox.y + THURSDAY_CLICK_MINUTE * PIXELS_PER_MINUTE

  await page.mouse.click(x, y)
  const popover = namedDialog(page, THURSDAY_LABEL)

  await confirmDelete(popover)
  await expect(popover).toBeHidden()
}

async function keyboardAddWednesdayRange(page: Page): Promise<void> {
  const track = wednesdayTrack(page)
  const { keyboard } = page

  await track.focus()
  await expect(track).toBeFocused()
  await keyboard.press(ENTER)
  await expect(namedDialog(page, WEDNESDAY_LABEL)).toBeVisible()
  await keyboard.press(ESCAPE)
}

async function keyboardActivateWednesdayBlock(page: Page): Promise<void> {
  const block = wednesdayBlock(page)
  const { keyboard } = page

  await block.focus()
  await expect(block).toBeFocused()
  await keyboard.press(SPACE_KEY)
  await expect(namedDialog(page, WEDNESDAY_LABEL)).toBeVisible()
  await keyboard.press(ESCAPE)
}

async function assertTuesdayPersisted(page: Page): Promise<void> {
  const popover = namedDialog(page, TUESDAY_LABEL)
  const startField = popover.getByLabel(TUESDAY_START_LABEL)
  const endSelect = popover.getByLabel(TUESDAY_END_LABEL)
  const noteField = popover.getByLabel(TUESDAY_NOTE_LABEL)

  await expect(startField).toHaveValue(TUESDAY_START_VALUE)
  await expect(endSelect).toHaveValue(TUESDAY_END_VALUE)
  await expect(noteField).toHaveValue(EDITED_NOTE_TEXT)
}

async function assertNoEditorActions(page: Page): Promise<void> {
  await expect(roleButton(page, SAVE_AVAILABILITY_LABEL)).toHaveCount(0)
  await expect(page.locator(FOCUSABLE_TRACK_SELECTOR)).toHaveCount(0)
}

async function assertOwnerCardReadOnly(page: Page): Promise<void> {
  await assertNoEditorActions(page)
  await expect(page.getByText(TUESDAY_FINAL_TIME_TEXT)).toBeVisible()
}

function isSaveResponse(response: Response): boolean {
  const method = response.request().method()

  return response.url().endsWith(AVAILABILITY_ENDPOINT) && method === PUT_METHOD
}

let ownerId: string
let teammateId: string
let adminId: string

test.beforeAll(async () => {
  const departamentoId = await firstDepartamentoId()
  const teamId = await ensureTeam(TEAM_CODE, 'E2E Availability Journey Team', departamentoId)
  const jornada = await firstActiveJornada()

  await ensureUser(OWNER_EMAIL, TASKS_ROLE, 'Owner', SURNAME)
  await ensureUser(TEAMMATE_EMAIL, TASKS_ROLE, 'Teammate', SURNAME)
  await ensureUser(ADMIN_EMAIL, ADMIN_ROLE, 'Admin', SURNAME)

  ownerId = (await getUsuario(OWNER_EMAIL)).id
  teammateId = (await getUsuario(TEAMMATE_EMAIL)).id
  adminId = (await getUsuario(ADMIN_EMAIL)).id

  const ownerOrganization = { userId: ownerId, equipoId: teamId, jornadaId: jornada.id }
  const teammateOrganization = { userId: teammateId, equipoId: teamId, jornadaId: jornada.id }

  await assignOrganization(ownerOrganization)
  await assignOrganization(teammateOrganization)
})

test.afterAll(async () => {
  await clearWeeklyAvailability([ownerId, teammateId, adminId])
  await deleteUser(OWNER_EMAIL)
  await deleteUser(TEAMMATE_EMAIL)
  await deleteUser(ADMIN_EMAIL)
  await deleteTeam(TEAM_CODE)
})

test('owner drag-creates, resizes, and edits Tuesday availability on the new grid; it ' +
  'persists, teammates and non-own cards stay read-only, and add/edit work by keyboard alone',
  async ({ page }) => {
  test.setTimeout(TEST_TIMEOUT_MS)
  await bypassOnboardingAndForceEnglish(page)
  await login(page, OWNER_EMAIL)
  await openAvailability(page)
  await cardFor(page, OWNER_CARD_NAME).click()
  await expect(namedDialog(page, OWNER_CARD_NAME)).toBeVisible()

  await dragCreateTuesdayRange(page)
  await fillCreatedTuesdayRange(page)
  await resizeTuesdayBlockEnd(page)
  await editTuesdayNote(page)
  await keyboardAddWednesdayRange(page)
  await keyboardActivateWednesdayBlock(page)
  await createAndDeleteThursdayRange(page)

  await Promise.all([
    page.waitForResponse(isSaveResponse),
    roleButton(page, SAVE_AVAILABILITY_LABEL).click(),
  ])
  await expect(namedDialog(page, OWNER_CARD_NAME)).toBeHidden()

  await page.reload()
  await openAvailability(page)
  await cardFor(page, OWNER_CARD_NAME).click()
  await tuesdayBlock(page).click()
  await assertTuesdayPersisted(page)
  await page.keyboard.press(ESCAPE)
  await expect(namedDialog(page, TUESDAY_LABEL)).toBeHidden()
  await page.keyboard.press(ESCAPE)
  await expect(namedDialog(page, OWNER_CARD_NAME)).toBeHidden()

  await cardFor(page, TEAMMATE_CARD_NAME).click()
  await assertNoEditorActions(page)
  await page.keyboard.press(ESCAPE)

  await login(page, ADMIN_EMAIL)
  await openAvailability(page)
  await expect(cardFor(page, OWNER_CARD_NAME)).toBeVisible()
  await expect(cardFor(page, TEAMMATE_CARD_NAME)).toBeVisible()
  await expect(cardFor(page, ADMIN_CARD_NAME)).toBeVisible()

  await cardFor(page, OWNER_CARD_NAME).click()
  await assertOwnerCardReadOnly(page)
  await page.keyboard.press(ESCAPE)

  await cardFor(page, TEAMMATE_CARD_NAME).click()
  await assertNoEditorActions(page)
  await page.keyboard.press(ESCAPE)

  // The seeded admin has no jornada, so even their own card is read-only and shows the notice once.
  await cardFor(page, ADMIN_CARD_NAME).click()
  await assertNoEditorActions(page)
  await expect(page.getByText(NO_JORNADA_NOTICE)).toHaveCount(1)
  await page.keyboard.press(ESCAPE)
  await expect(namedDialog(page, ADMIN_CARD_NAME)).toBeHidden()

  await page.setViewportSize(NARROW_VIEWPORT)

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const viewportWidth = await page.evaluate(() => window.innerWidth)
  const overflows = scrollWidth > viewportWidth + OVERFLOW_TOLERANCE_PX
  const overflowMessage = 'availability screen overflows the narrow viewport'

  expect(overflows, overflowMessage).toBe(false)
})
