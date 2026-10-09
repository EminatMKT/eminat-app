import { expect, it } from 'vitest'
import colors from '.'

it('exposes the accent tier color as a CSS variable reference', () => {
  expect(colors.COLOR_ACCENT).toBe('var(--c-accent)')
})

it('exposes the warn tier color as a CSS variable reference', () => {
  expect(colors.COLOR_WARN).toBe('var(--c-warn-solid)')
})

it('exposes the danger tier color as a CSS variable reference', () => {
  expect(colors.COLOR_DANGER).toBe('var(--c-danger)')
})
