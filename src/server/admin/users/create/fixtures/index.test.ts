import { describe, it, expect } from 'vitest'
import createUserContract from '@/server/admin/users/create/contract'
import CREATE_FIXTURES from '.'

const { newUser, orphanRow } = CREATE_FIXTURES

describe('create-user fixtures', () => {
  it('the new user is a body the contract accepts as is', () => {
    expect(createUserContract(newUser).success).toBe(true)
  })
  it('the orphan row is the same person, with no Auth account yet', () => {
    expect(orphanRow).toMatchObject({ nombre: newUser.nombre, apellido: newUser.apellido, auth_id: null })
  })
})
