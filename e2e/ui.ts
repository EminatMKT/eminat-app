import { expect, Page } from '@playwright/test'
import { MODULE, modulePath } from '@/shared/auth/permissions'
import { PASSWORD } from './seed'
import {
  HOME_URL, LOGIN_PATH, EMAIL_PLACEHOLDER, PASSWORD_INPUT, HOME_LINK, ROLES_TAB, DENIED,
  MAIN, ENTER, BUTTON,
} from './constants'

// Los tres pasos de navegación que repite todo spec de gating: entrar, abrir el panel admin y
// comprobar que una ruta rebota. Salieron de `roles.spec.ts` cuando ese archivo se partió en dos
// y quedaron acá para que el segundo no los copiara.

async function loginAs(page: Page, email: string) {
  await page.context().clearCookies()
  await page.goto(LOGIN_PATH)
  try { await page.evaluate(() => localStorage.clear()) } catch {}
  await page.goto(LOGIN_PATH)
  await page.getByPlaceholder(EMAIL_PLACEHOLDER).fill(email)
  const pw = page.locator(PASSWORD_INPUT)
  await pw.fill(PASSWORD)
  await pw.press(ENTER)
  await page.waitForURL(HOME_URL, { timeout: 40000 })
  // Esperar a que loadProfile termine (sesión persistida) ANTES de navegar:
  // un fallo transitorio dispararía el signOut destructivo del AppContext.
  await expect(page.getByText(HOME_LINK, { exact: true })).toBeVisible({ timeout: 20000 })
}

// Navegación client-side al panel admin (mantiene el provider montado → sin remount
// ni recarga de perfil, evita la carrera de sesión del goto de página completa).
async function openAdmin(page: Page) {
  await page.locator(`[data-tour="${MODULE.ADMIN}"]`).click()
  await page.waitForURL(`**${modulePath(MODULE.ADMIN)}`)
  await page.locator(MAIN).getByRole(BUTTON, { name: ROLES_TAB, exact: true }).waitFor()
}

// Verifica Access denied en una ruta gateada. El goto de página completa remonta el
// provider y un loadProfile transitorio dispara el signOut destructivo (sticky). Por eso
// se re-loguea fresco en cada reintento de toPass: cada intento parte de sesión nueva.
async function assertDenied(page: Page, email: string, path: string) {
  await expect(async () => {
    await loginAs(page, email)
    await page.goto(path)
    await expect(page.getByText(DENIED)).toBeVisible({ timeout: 8000 })
  }).toPass({ timeout: 45000, intervals: [500, 1500, 3000] })
}

export default { loginAs, openAdmin, assertDenied }
