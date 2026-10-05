import { expect, it } from 'vitest'
import ROLE_HTTP from '.'

it('names the response inits and query options both role routes share', () => {
  expect(ROLE_HTTP.badRequest).toEqual({ status: 400 })
  expect(ROLE_HTTP.created).toEqual({ status: 201 })
  expect(ROLE_HTTP.countOnly).toEqual({ count: 'exact', head: true })
})

it('names the bodies the role routes answer with', () => {
  expect(ROLE_HTTP.done).toEqual({ ok: true })
  expect(ROLE_HTTP.systemRoleDelete).toEqual({ error: 'A system role cannot be deleted.' })
  expect(ROLE_HTTP.roleInUse).toEqual({ error: 'The role still has users. Reassign them before deleting it.' })
})
