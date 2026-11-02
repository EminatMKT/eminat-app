import { test, expect } from '@playwright/test'
import type { Page, Response } from '@playwright/test'
import { ADMIN_ROLE } from '@/shared/auth/permissions'
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

function cardFor(page: Page, name: string) {
  const nameFilter = { hasText: name }

  return page.locator('article').filter(nameFilter)
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

test('owner edits and saves Monday availability, it persists, a teammate stays read-only, ' +
  'an admin can edit only their own card, and the layout holds at a narrow viewport', async ({ page }) => {
  await bypassOnboardingAndForceEnglish(page)
  await login(page, OWNER_EMAIL)
  await openAvailability(page)

  const ownerCardName = `Owner ${SURNAME}`
  const teammateCardName = `Teammate ${SURNAME}`
  const adminCardName = `Admin ${SURNAME}`

  await cardFor(page, ownerCardName).getByRole('button', { name: 'Edit', exact: true }).click()

  const addMondayRange = page.getByRole('button', { name: 'Add a Monday range' })

  await addMondayRange.click()
  await addMondayRange.click()

  const starts = page.getByLabel('Monday start time')
  const ends = page.getByLabel('Monday end time')

  await starts.nth(0).fill('09:00')
  await ends.nth(0).fill('13:00')
  await starts.nth(1).fill('14:00')
  await ends.nth(1).fill('17:00')
  await page.getByLabel('Monday note').nth(1).fill('Not available for meetings')

  await expect(page.getByText(/7 of 8 hours/i)).toBeVisible()

  const saveButton = page.getByRole('button', { name: 'Save availability' })

  await expect(saveButton).toBeEnabled()

  const isSaveResponse = (response: Response) =>
    response.url().endsWith('/api/tasks/availability') && response.request().method() === 'PUT'

  await Promise.all([
    page.waitForResponse(isSaveResponse),
    saveButton.click(),
  ])

  // 'N of M hours' also renders live while editing, so it proves nothing about the save. The
  // editor only unmounts back to the read-only card from `onSaved`, called once its PUT
  // resolves -- waiting for that avoids reloading out from under an in-flight request.
  await expect(saveButton).toBeHidden()

  await page.reload()
  await openAvailability(page)
  await expect(page.getByText('09:00–13:00')).toBeVisible()
  await expect(page.getByText('14:00–17:00')).toBeVisible()
  await expect(page.getByText('Not available for meetings')).toBeVisible()
  await expect(cardFor(page, teammateCardName).getByRole('button', { name: 'Edit' })).toHaveCount(0)

  await login(page, ADMIN_EMAIL)
  await openAvailability(page)
  await expect(cardFor(page, ownerCardName)).toBeVisible()
  await expect(cardFor(page, teammateCardName)).toBeVisible()
  await expect(cardFor(page, adminCardName)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(1)
  await expect(cardFor(page, ownerCardName).getByRole('button', { name: 'Edit' })).toHaveCount(0)
  await expect(cardFor(page, teammateCardName).getByRole('button', { name: 'Edit' })).toHaveCount(0)
  await expect(cardFor(page, adminCardName).getByRole('button', { name: 'Edit' })).toHaveCount(1)

  // Already on the Availability screen from the admin flow above -- resizing in place, not
  // re-navigating, since the sidebar's own narrow-width behavior is a separate, pre-existing
  // concern from whether THIS screen's content overflows.
  await page.setViewportSize(NARROW_VIEWPORT)

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const viewportWidth = await page.evaluate(() => window.innerWidth)
  const overflows = scrollWidth > viewportWidth + OVERFLOW_TOLERANCE_PX

  expect(overflows, 'availability screen overflows the narrow viewport').toBe(false)
})
