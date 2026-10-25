import { expect, test } from '@playwright/test'

const authId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const profileId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const email = 'row-menu-qa@example.invalid'
const user = { id: authId, email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const rows = Array.from({ length: 40 }, (_, i) => ({ id: i ? `10000000-0000-4000-8000-${String(i).padStart(12, '0')}` : profileId, auth_id: i ? `20000000-0000-4000-8000-${String(i).padStart(12, '0')}` : authId, email: i ? `row-${i}@example.invalid` : email, nombre: `Synthetic ${i}`, apellido: 'User', rol: i ? 'stratix' : 'admin', activo: true, validado: true }))

for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, laptop: { width: 1280, height: 720 }, 'laptop-125-percent-effective-viewport': { width: 1024, height: 576 }, narrow: { width: 390, height: 844 } })) {
  test(`${name}: Admin row menus stay usable at every table position`, async ({ page, context }) => {
    await page.setViewportSize(viewport)
    await page.addInitScript(() => { localStorage.setItem('locale', 'en'); localStorage.setItem('eminat-onboarding-completed', 'true') })
    const expires = Math.floor(Date.now() / 1000) + 3600
    const jwt = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: authId, aud: 'authenticated', role: 'authenticated', exp: expires })).toString('base64url')}.synthetic`
    const session = { access_token: jwt, refresh_token: 'synthetic', expires_at: expires, expires_in: 3600, token_type: 'bearer', user }
    await context.addCookies([{ name: 'sb-example-auth-token', value: encodeURIComponent(JSON.stringify(session)), url: 'http://localhost:3107' }])
    const mutations: string[] = []
    await page.route('https://example.supabase.co/**', async route => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      if (path.startsWith('/auth/v1/')) return route.fulfill({ status: 200, json: path.endsWith('/user') ? user : session })
      const heartbeat = request.method() === 'PATCH' && path.endsWith('/usuarios') && Object.keys(request.postDataJSON() ?? {}).join() === 'online_at'
      if (!heartbeat && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutations.push(path)
      const table = path.split('/').at(-1)
      const data = table === 'usuarios' ? rows : table === 'roles' ? [{ key: 'admin', label: 'Admin' }, { key: 'stratix', label: 'Stratix' }] : []
      const single = request.headers()['accept']?.includes('vnd.pgrst.object')
      await route.fulfill({ status: 200, json: single ? data[0] ?? null : data })
    })
    await page.route('**/api/**', route => route.fulfill({ status: 200, json: { utcMs: Date.now(), scopes: [], birthday: null } }))
    await page.goto('/admin')
    const triggers = page.getByRole('button', { name: /^Actions for Synthetic/ })
    await expect(triggers).toHaveCount(40)
    const assertMenu = async (index: number) => {
      const trigger = triggers.nth(index)
      await trigger.click()
      const menu = page.getByRole('menu')
      await expect(menu).toBeVisible()
      const bounds = await menu.evaluate(el => {
        const r = el.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: window.innerHeight, width: window.innerWidth, portal: el.parentElement === document.body, zIndex: Number(getComputedStyle(el).zIndex) }
      })
      expect(bounds.portal).toBe(true)
      expect(bounds.zIndex).toBeGreaterThanOrEqual(1000)
      expect(bounds.top).toBeGreaterThanOrEqual(7)
      expect(bounds.bottom).toBeLessThanOrEqual(bounds.height - 7)
      expect(bounds.left).toBeGreaterThanOrEqual(7)
      expect(bounds.right).toBeLessThanOrEqual(bounds.width - 7)
      await expect(menu.getByRole('menuitem').first()).toBeFocused()
      await menu.getByRole('menuitem').first().press('End')
      await expect(menu.getByRole('menuitem').last()).toBeFocused()
      await menu.getByRole('menuitem').last().press('Home')
      await expect(menu.getByRole('menuitem').first()).toBeFocused()
      await menu.getByRole('menuitem').first().press('ArrowUp')
      await expect(menu.getByRole('menuitem').last()).toBeFocused()
      await page.screenshot({ path: `test-results/menu-${name}-${index}.png` })
      await menu.getByRole('menuitem').last().press('Escape')
      await expect(menu).toHaveCount(0)
      await expect(trigger).toBeFocused()
    }
    await assertMenu(0)
    // Last currently visible row, before scrolling farther into the table.
    const visible = await triggers.evaluateAll(elements => elements.map((el, i) => ({ i, r: el.getBoundingClientRect() })).filter(({ r }) => r.top >= 0 && r.bottom <= window.innerHeight).map(({ i }) => i))
    if (visible.length) await assertMenu(visible.at(-1)!)
    await assertMenu(20)
    await assertMenu(39)
    await triggers.last().evaluate(el => el.scrollIntoView({ block: 'end', inline: 'nearest' }))
    await triggers.last().click()
    await expect(page.getByRole('menu')).toHaveAttribute('data-placement', 'top')
    const last = page.getByRole('menuitem').last()
    const point = await last.boundingBox()
    expect(point).not.toBeNull()
    expect(await last.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) })).toBe(true)
    await last.press('Tab')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await triggers.last().press('ArrowUp')
    await expect(page.getByRole('menuitem').last()).toBeFocused()
    await page.mouse.click(2, 2)
    await expect(page.getByRole('menu')).toHaveCount(0)
    await triggers.last().click()
    await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Edit user', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    expect(mutations).toEqual([])
  })
}
