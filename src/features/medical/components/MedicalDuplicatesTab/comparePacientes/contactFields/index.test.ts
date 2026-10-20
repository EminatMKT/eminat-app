import { describe, expect, it } from 'vitest'
import CONTACT_TYPE from '@/features/medical/constants/contactType'
import CONTACT_FIELDS from '.'

describe('CONTACT_FIELDS', () => {
  it('covers exactly the contact types the database allows', () => {
    const keys = CONTACT_FIELDS.map(({ key }) => key)
    const allowed = Object.values(CONTACT_TYPE)
    expect(keys.sort()).toEqual(allowed.sort())
  })
})
