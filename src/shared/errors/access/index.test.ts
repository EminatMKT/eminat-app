import { expect, it } from 'vitest'
import ACCESS_ERRORS from '.'

const SLUG = 'tasks'

it('names the session and permission failures the API guards answer with', () => {
  expect(ACCESS_ERRORS.notAuthenticated).toBe('Not authenticated.')
  expect(ACCESS_ERRORS.adminRequired).toBe('Admin role required.')
  expect(ACCESS_ERRORS.moduleRequired(SLUG)).toContain(SLUG)
})
