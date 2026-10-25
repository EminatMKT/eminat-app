import { expect, test } from '@playwright/test'
import en from '../src/shared/i18n/locales/en.json'
import es from '../src/shared/i18n/locales/es.json'

for (const [locale, copy] of Object.entries({ en, es })) {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    test(`${locale} login and recovery at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.addInitScript(value => localStorage.setItem('locale', value), locale)
      const calls: { path: string; body: Record<string, string>; url: string }[] = []
      await page.route('**/auth/v1/**', async route => {
        const request = route.request()
        calls.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() || {}, url: request.url() })
        await route.fulfill({ status: request.url().includes('/recover') ? 200 : 400, contentType: 'application/json', body: request.url().includes('/recover') ? '{}' : JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }) })
      })
      await page.goto('/login')
      await expect(page.getByRole('heading', { level: 1 })).toContainText(copy['login.headlineLead'])
      await expect(page.getByRole('heading', { level: 2 })).toHaveText(copy['login.signIn'])
      expect(await page.locator('body').innerText()).not.toContain('ANNIE')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await expect(page.locator('img[src*="lilly-orbital-astronaut"]')).toBeVisible()
      await expect(page.locator('img')).toHaveJSProperty('complete', true)
      await page.screenshot({ path: `test-results/lilly-${locale}-${viewport.width}.png`, fullPage: true })
      await page.locator('#login-email').fill('visual-qa@stratix360.com')
      await page.locator('#login-password').fill('synthetic-password')
      await page.getByRole('button', { name: copy['login.showPassword'], exact: true }).click()
      await expect(page.locator('#login-password')).toHaveAttribute('type', 'text')
      await page.getByRole('button', { name: copy['login.hidePassword'], exact: true }).click()
      await expect(page.locator('#login-password')).toHaveAttribute('type', 'password')
      await page.getByRole('button', { name: copy['login.signIn'], exact: true }).click()
      await expect(page.locator('main [role=alert]')).toHaveText(copy['login.errCreds'])
      expect(calls.find(call => call.path.endsWith('/token'))?.body).toMatchObject({ email: 'visual-qa@stratix360.com', password: 'synthetic-password' })
      await page.getByRole('button', { name: copy['login.forgot'], exact: true }).click()
      await expect(page.locator('#login-password')).toHaveCount(0)
      await page.getByRole('button', { name: copy['login.sendResetLink'], exact: true }).click()
      await expect(page.getByRole('status')).toContainText(copy['login.sentTitle'])
      const recovery = calls.find(call => call.path.endsWith('/recover'))
      expect(recovery?.body.email).toBe('visual-qa@stratix360.com')
      expect(new URL(recovery!.url).searchParams.get('redirect_to')).toBe(new URL('/reset-password', page.url()).href)
      await page.getByRole('button', { name: new RegExp(copy['login.backToSignIn']) }).click()
      await expect(page.locator('#login-password')).toBeVisible()
      await page.getByRole('button', { name: locale === 'es' ? 'Switch to English' : 'Cambiar a español' }).click()
      await expect(page.getByRole('heading', { level: 2 })).toHaveText(locale === 'es' ? en['login.signIn'] : es['login.signIn'])
    })
  }
}
