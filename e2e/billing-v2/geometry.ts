import type { Locator, Page } from '@playwright/test'

/** Every visible element of billing's page that reaches past the right edge of the screen. The
 *  page is the box that holds its heading's row; the shell's topbar is shared by every module
 *  and has no landmark to leave out, so it is measured apart, not here. */
function pastTheEdge(heading: Locator) {
  return heading.evaluate((title) => {
    const edge = window.innerWidth
    const offenders: string[] = []
    const page = title.parentElement?.parentElement
    for (const element of Array.from(page?.querySelectorAll('*') ?? [])) {
      const box = element.getBoundingClientRect()
      const shown = box.width > 0 && box.height > 0
      if (shown && box.right > edge + 1) offenders.push(`${element.tagName.toLowerCase()}.${element.className} → ${Math.round(box.right)}`)
    }
    return offenders
  })
}

/** Where an element sits on screen, in CSS pixels, and whether its text is wider than its box. */
function edges(element: Locator) {
  return element.evaluate((node) => {
    const { top, bottom, left, right } = node.getBoundingClientRect()
    const place = { top, bottom, left, right, spills: node.scrollWidth > node.clientWidth }
    return place
  })
}

/** How far the window itself has been scrolled sideways. */
function scrolledSideways(page: Page) {
  return page.evaluate(() => window.scrollX)
}

/** How the phone check measures the screen: what spills, where a piece sits, sideways scroll. */
const geometry = { pastTheEdge, edges, scrolledSideways }
export default geometry

// `pastTheEdge` lists every element past the edge, because an `overflow: hidden` ancestor hides it
// from the page's scroll width.
