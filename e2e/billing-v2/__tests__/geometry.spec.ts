import { test, expect } from '@playwright/test'
import geometry from '../geometry'

const WINDOW = { width: 400, height: 300 }
const PLACED = `<div style="position:absolute;top:10px;left:20px;width:100px;height:30px">box</div>`
const SPILLING = `<div style="width:40px;overflow:hidden;white-space:nowrap">a line far too long for it</div>`
// A page whose heading sits in a row, the way billing's does, with one piece past the edge.
const PAGE = `<section><div><h2>Title</h2></div><p style="width:900px">wide</p><i>narrow</i></section>`

test.use({ viewport: WINDOW })

test('edges gives where a box sits, and that its text fits', async ({ page }) => {
  await page.setContent(PLACED)
  const box = await geometry.edges(page.locator('div'))
  expect(box).toEqual({ top: 10, bottom: 40, left: 20, right: 120, spills: false })
})

test('edges tells a box whose text is wider than it', async ({ page }) => {
  await page.setContent(SPILLING)
  expect((await geometry.edges(page.locator('div'))).spills).toBe(true)
})

test('pastTheEdge names only what reaches past the window', async ({ page }) => {
  await page.setContent(PAGE)
  const offenders = await geometry.pastTheEdge(page.locator('h2'))
  expect(offenders).toHaveLength(1)
  expect(offenders[0]).toMatch(/^p\./)
})

test('scrolledSideways is zero on a page that was not scrolled', async ({ page }) => {
  await page.setContent(PAGE)
  expect(await geometry.scrolledSideways(page)).toBe(0)
})
