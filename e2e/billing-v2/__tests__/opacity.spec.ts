import { test, expect } from '@playwright/test'
import expectOpaque from '../opacity'

const TARGET = '#target'
// The element itself is opaque; what hides it is an ancestor, as a stalled fade-in does.
const FADED = `<div style="opacity: 0"><div><p id="target">x</p></div></div>`
const HALF = `<div style="opacity: 0.5"><p id="target">x</p></div>`
const SHOWN = `<div><div><p id="target">x</p></div></div>`

test('passes an element nothing above it hides', async ({ page }) => {
  await page.setContent(SHOWN)
  await expectOpaque(page.locator(TARGET))
})

test('fails an element whose ancestor is transparent, though toBeVisible passes it', async ({ page }) => {
  await page.setContent(FADED)
  await expect(page.locator(TARGET)).toBeVisible()
  await expect(expectOpaque(page.locator(TARGET))).rejects.toThrow()
})

test('fails an element only half faded in', async ({ page }) => {
  await page.setContent(HALF)
  await expect(expectOpaque(page.locator(TARGET))).rejects.toThrow()
})
