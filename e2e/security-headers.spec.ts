import { expect, test } from '@playwright/test'

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`security headers preserve bilingual login hydration at ${viewport.width}`, async ({ page, request }) => {
    await page.setViewportSize(viewport)
    const violations: string[] = []
    await page.exposeFunction('recordCspViolation', (value: string) => violations.push(value))
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation', event => {
      void (window as unknown as { recordCspViolation: (value: string) => Promise<void> }).recordCspViolation(event.violatedDirective + ':' + event.blockedURI + ':' + event.sourceFile + ':' + event.lineNumber)
    }))
    await page.route('**/auth/v1/**', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }) }))
    const response = await page.goto('/login')
    const headers = response!.headers()
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(headers['content-security-policy']).not.toContain('unsafe-eval')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['permissions-policy']).toContain('geolocation=()')
    expect(headers['x-powered-by']).toBeUndefined()
    await page.locator('#login-email').fill('synthetic-security@stratix360.com')
    await page.locator('#login-password').fill('synthetic-password')
    await page.locator('#login-password').press('Enter')
    await expect(page.locator('main [role=alert]')).toBeVisible()
    await page.getByRole('button', { name: /Switch to English|Cambiar a español/ }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    // Zod probes JIT with Function("") inside try/catch and falls back under CSP.
    // Keep eval blocked; require the exact known probe, with working form hydration.
    expect(violations.length).toBeLessThanOrEqual(1)
    for (const violation of violations) {
      expect(violation).toMatch(/^script-src:eval:https?:\/\/[^/]+\/_next\/static\/chunks\/[^:]+:\d+$/)
      const source = violation.slice('script-src:eval:'.length).replace(/:\d+$/, '')
      expect(await (await request.get(source)).text()).toContain('try{return Function(""),!0}catch')
    }
    const anonymous = await request.get('/api/patient/v1/profile')
    expect(anonymous.status()).toBe(401)
    expect(anonymous.headers()['cache-control']).toContain('no-store')
    const sales = await request.get('/api/sales-native/bootstrap')
    expect([401, 404]).toContain(sales.status())
    expect(sales.headers()['cache-control']).toContain('no-store')
  })
}
