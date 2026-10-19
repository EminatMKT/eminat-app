import { expect, it } from 'vitest'
import COUNT_ONLY from '.'

it('asks PostgREST for a match count only, never row data', () => {
  expect(COUNT_ONLY.count).toBe('exact')
  expect(COUNT_ONLY.head).toBe(true)
})
