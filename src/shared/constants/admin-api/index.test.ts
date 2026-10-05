import { expect, it } from 'vitest'
import ADMIN_API from '.'

const ADMIN_PREFIX = '/api/admin/'

it('names every admin endpoint under /api/admin', () => {
  for (const path of Object.values(ADMIN_API)) expect(path.startsWith(ADMIN_PREFIX)).toBe(true)
  expect(ADMIN_API.updateUser).toBe('/api/admin/update-user')
  expect(ADMIN_API.deleteUser).toBe('/api/admin/delete-user')
})
