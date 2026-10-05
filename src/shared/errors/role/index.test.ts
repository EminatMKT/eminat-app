import { expect, it } from 'vitest'
import ROLE_ERRORS from '.'

const BAD_SLUGS = ['fake', 'nope']

it('names the role-form failures and lists the invalid modules', () => {
  expect(ROLE_ERRORS.nameRequired).toBe('The role name is required.')
  expect(ROLE_ERRORS.nameTaken).toBe('A role with that name already exists.')
  expect(ROLE_ERRORS.nameReserved).toBe('That name is reserved by the system.')
  expect(ROLE_ERRORS.invalidModules(BAD_SLUGS)).toBe('Invalid modules: fake, nope')
})
