import { test, expect } from '@playwright/test'
import { ADMIN_ROLE, MODULE, modulePath } from '@/shared/auth/permissions'
import { BUTTON, DIALOG, ESCAPE } from '@/shared/constants/dom'
import translate from '@/shared/i18n/translate'
import { deleteUser, ensureUser } from '@e2e/seed'
import { MULTI_ADMIN_EMAIL } from '@e2e/constants'
import harness from '@e2e/billing-v2/session'

const TASKS_ROLE = 'stratix360'
const SURNAME = 'Multie2e'
const PEOPLE = ['Ana', 'Beto', 'Ceci'].map(first =>
  ({ email: `multi.${first.toLowerCase()}.e2e@eminat.net`, first, full: `${first} ${SURNAME}` }))
const [CREATOR, LEADER] = PEOPLE
const BRAND = 'EMC'
const LOCALE = 'es'
const UI_WAIT = { timeout: 15000 }
const COMBOBOX = 'combobox'
const OPTION = 'option'
const LISTBOX = 'listbox'
const say = (key: Parameters<typeof translate>[1]) => translate(LOCALE, key)
const named = (name: string) => ({ name })
const exactly = (name: string) => ({ name, exact: true })
const labelled = (label: string) => ({ label })
const holding = (hasText: string) => ({ hasText })
const taskTitle = `Multi-responsibles e2e ${Date.now()}`

// Its own admin, not freddy@: e2e/roles demotes and deletes admins on purpose, and this spec must
// not depend on which ran first. Deleted afterwards so the last-admin check never counts it.
test.beforeAll(async () => {
  for (const p of PEOPLE) await ensureUser(p.email, TASKS_ROLE, p.first, SURNAME)
  await ensureUser(MULTI_ADMIN_EMAIL, ADMIN_ROLE, 'Admin', SURNAME)
})
test.afterAll(async () => { await deleteUser(MULTI_ADMIN_EMAIL) })

test('a task with three responsibles and a leader', async ({ page }) => {
  const openTasksAs = async (email: string) => {
    await harness.loginAs(page, email)
    await page.locator(`[data-tour="${MODULE.TASKS}"]`).click()
    await page.waitForURL(`**${modulePath(MODULE.TASKS)}`)
  }
  await test.step('create one task with a principal and two collaborators', async () => {
    await openTasksAs(CREATOR.email)
    await page.getByRole(BUTTON, named(say('stratix.newTask'))).click()
    const modal = page.getByRole(DIALOG)
    await modal.getByPlaceholder(say('stratix.new.titlePh')).fill(taskTitle)
    await modal.locator(`select:has(option[value="${BRAND}"])`).selectOption(BRAND)
    await modal.getByLabel('Responsable principal').selectOption(labelled(LEADER.full))
    const picker = modal.getByRole(COMBOBOX, named('Colaboradores'))
    await picker.click()
    const panel = modal.getByRole(LISTBOX)
    for (const p of PEOPLE.filter(person => person !== LEADER)) await panel.getByRole(OPTION, exactly(p.full)).click()
    await expect(panel.getByRole(OPTION, exactly(LEADER.full))).toHaveCount(0)
    await picker.press(ESCAPE)
    await expect(modal.getByRole(LISTBOX)).toHaveCount(0)
    await expect(picker).toHaveValue('2 colaboradores')
    await modal.getByRole(BUTTON, named(say('stratix.new.create'))).click()
    const card = page.locator('[draggable="true"]').filter(holding(taskTitle))
    await expect(card).toBeVisible(UI_WAIT)
    await expect(card.getByRole('img', named(say('tasks.responsibles.leaderBadge')))).toBeVisible(UI_WAIT)
    await expect(card).toContainText(`${LEADER.full} +2`)
  })
  await test.step('the admin report lists it for each of the three', async () => {
    await openTasksAs(MULTI_ADMIN_EMAIL)
    await page.getByRole(BUTTON, named('Report')).click()
    const memberSelect = page.locator('#reporte-controls select').first()
    for (const p of PEOPLE) {
      await memberSelect.selectOption(labelled(p.full))
      await expect(page.locator('#reporte-content').getByText(taskTitle)).toBeVisible(UI_WAIT)
    }
  })
})
