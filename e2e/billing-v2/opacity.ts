import { expect, type Locator } from '@playwright/test'

/** How opaque an element really looks: its own opacity times every ancestor's. */
function seenOpacity(element: Locator) {
  return element.evaluate((start) => {
    let seen = 1
    for (let node: Element | null = start; node; node = node.parentElement) {
      seen *= Number(getComputedStyle(node).opacity)
    }
    return seen
  })
}

// The page fades in over 0.4 s: well past that, a page still see-through is a stalled fade.
const FADE_BUDGET = { timeout: 1500 }

/** Fails unless the element is visible AND, soon after, fully opaque: its fade-in finished. */
export default async function expectOpaque(element: Locator) {
  await expect(element).toBeVisible()
  await expect.poll(() => seenOpacity(element), FADE_BUDGET).toBe(1)
}

// `toBeVisible` ignores opacity: a page stuck at opacity 0 behind a stalled fade-in passes it
// while nobody could see it. Opacity multiplies down the tree, so every ancestor counts.
