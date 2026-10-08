import { expect, it } from 'vitest'
import { PLACEHOLDER } from './constants'

it('uses an em dash as the not-loaded-yet placeholder', () => {
  expect(PLACEHOLDER).toBe('—')
})
