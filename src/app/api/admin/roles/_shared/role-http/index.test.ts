import { expect, it } from 'vitest'
import ROLE_HTTP from '.'

it('names the response inits and query options both role routes share', () => {
  expect(ROLE_HTTP.badRequest).toEqual({ status: 400 })
  expect(ROLE_HTTP.created).toEqual({ status: 201 })
  expect(ROLE_HTTP.countOnly).toEqual({ count: 'exact', head: true })
})
