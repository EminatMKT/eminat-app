import { test, expect } from '@playwright/test'
import { MODULE, modulePath } from '@/shared/auth/permissions'
import { BUTTON, DIALOG } from '@/shared/constants/dom'
import translate from '@/shared/i18n/translate'
import type { I18nKey } from '@/shared/i18n'
import { ensureUser } from './seed'
import harness from './billing-v2/session'

const TASKS_ROLE = 'stratix360'
const ADMIN_EMAIL = 'freddy@eminat.net'
const SURNAME = 'Multie2e'
const PEOPLE = ['Ana', 'Beto', 'Ceci'].map(first =>
  ({ email: `multi.${first.toLowerCase()}.e2e@eminat.net`, first, full: `${first} ${SURNAME}` }))
const [CREATOR, LEADER] = PEOPLE
const BRAND = 'EMC'
const LOCALE = 'es'
const UI_WAIT = { timeout: 15000 }
const say = (key: I18nKey) => translate(LOCALE, key)
const named = (name: string) => ({ name })
const exactly = (name: string) => ({ name, exact: true })
const labelled = (label: string) => ({ label })
const holding = (hasText: string) => ({ hasText })
const taskTitle = `Multi-responsibles e2e ${Date.now()}`

test.beforeAll(async () => { for (const p of PEOPLE) await ensureUser(p.email, TASKS_ROLE, p.first, SURNAME) })

test('a task with three responsibles and a leader', async ({ page }) => {
  const openTasksAs = async (email: string) => {
    await harness.loginAs(page, email)
    await page.locator(`[data-tour="${MODULE.TASKS}"]`).click()
    await page.waitForURL(`**${modulePath(MODULE.TASKS)}`)
  }
  await test.step('create it as a non-admin and see crown + leader +2 on the card', async () => {
    await openTasksAs(CREATOR.email)
    await page.getByRole(BUTTON, named(say('stratix.newTask'))).click()
    const modal = page.getByRole(DIALOG)
    await modal.getByPlaceholder(say('stratix.new.titlePh')).fill(taskTitle)
    await modal.locator(`select:has(option[value="${BRAND}"])`).selectOption(BRAND)
    for (const p of PEOPLE) await modal.getByRole('checkbox', exactly(p.full)).check()
    const leaderLabel = translate(LOCALE, 'tasks.responsibles.leaderToggleAria', named(LEADER.full))
    const leaderToggle = modal.getByRole(BUTTON, exactly(leaderLabel))
    await leaderToggle.click()
    await expect(leaderToggle).toHaveAttribute('aria-pressed', 'true')
    await modal.getByRole(BUTTON, named(say('stratix.new.create'))).click()
    const card = page.locator('[draggable="true"]').filter(holding(taskTitle))
    await expect(card).toBeVisible(UI_WAIT)
    await expect(card.getByRole('img', named(say('tasks.responsibles.leaderBadge')))).toBeVisible()
    await expect(card).toContainText(`${LEADER.full} +2`)
  })
  await test.step('the admin report lists it for each of the three', async () => {
    await openTasksAs(ADMIN_EMAIL)
    await page.getByRole(BUTTON, named('Report')).click()
    const memberSelect = page.locator('#reporte-controls select').first()
    for (const p of PEOPLE) {
      await memberSelect.selectOption(labelled(p.full))
      await expect(page.locator('#reporte-content').getByText(taskTitle)).toBeVisible(UI_WAIT)
    }
  })
})
