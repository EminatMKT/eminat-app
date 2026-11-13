import { expect, it } from 'vitest'
import noopHandler from '.'

it('does nothing and returns nothing, whatever pointer event it is handed', () => {
  expect(noopHandler()).toBeUndefined()
})
