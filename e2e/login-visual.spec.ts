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
      expect(await page.locator('body').innerText()).not.toMatch(/ANNIE|Freddy/i)
      const tablet = page.getByTestId('login-tablet')
      await expect(tablet).toBeVisible()
      await expect(tablet.locator('h2')).toHaveText(copy['launchpad.greeting'].replace('{name}', 'Fred'))
      await expect(tablet.locator('h3')).toHaveText(['Tasks', 'Marketing', 'Billing', 'Research', 'Medical', 'Accounting', 'Hr', 'Directory'].map(area => copy[`login.tablet${area}` as keyof typeof copy]))
      await expect(tablet).toContainText(copy['launchpad.seeAll'])
      await expect(tablet.locator('aside')).toContainText('Sales')
      expect(await tablet.locator(':scope > div').evaluate(screen => screen.scrollHeight <= screen.clientHeight + 1)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await expect(page.locator('img[src*="lilly-orbital-astronaut"]')).toBeVisible()
      await expect(page.locator('img[src*="laika"], img[src*="felicette"]')).toHaveCount(0)
      for (const image of await page.locator('img').all()) {
        await expect(image).toHaveJSProperty('complete', true)
        expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0)
      }
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

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`decorative scene respects ${reducedMotion} motion preference`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.emulateMedia({ reducedMotion })
    await page.goto('/login')
    const hero = page.locator('section[aria-labelledby="lilly-headline"]')
    const layers = [page.locator('img[src*="lilly-orbital-astronaut"]').locator('..'), hero.getByTestId('login-tablet')]
    const transforms = await Promise.all(layers.map(layer => layer.evaluate(element => getComputedStyle(element).transform)))
    const bounds = (await hero.boundingBox())!
    await page.mouse.move(bounds.x + bounds.width * .9, bounds.y + bounds.height * .65)
    if (reducedMotion === 'reduce') {
      await expect.poll(() => hero.evaluate(element => getComputedStyle(element).getPropertyValue('--pointer-x').trim())).toBe('0')
      for (let index = 0; index < layers.length; index++) {
        const layer = layers[index]
        expect(await layer.evaluate(element => getComputedStyle(element).transform)).toBe(transforms[index])
      }
    } else {
      await expect.poll(() => hero.evaluate(element => Number(getComputedStyle(element).getPropertyValue('--pointer-x')))).toBeGreaterThan(.5)
      for (let index = 0; index < layers.length; index++) {
        const layer = layers[index]
        await expect.poll(() => layer.evaluate(element => getComputedStyle(element).transform)).not.toBe(transforms[index])
      }
      await page.mouse.move(1400, 500)
      await expect.poll(() => hero.evaluate(element => Number(getComputedStyle(element).getPropertyValue('--pointer-x')))).toBe(0)
    }
    await page.locator('#login-email').focus()
    await expect(page.locator('#login-email')).toBeFocused()
    expect(await hero.locator('button, input, a, [tabindex]').count()).toBe(0)
  })
}
