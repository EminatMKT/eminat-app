import { describe, expect, it } from 'vitest'
import memberInitials from '.'

describe('memberInitials', () => {
  it('takes the first letter of the first and last word, uppercased', () => {
    const fullName = 'Ana López'
    const expectedInitials = 'AL'

    expect(memberInitials(fullName)).toBe(expectedInitials)
  })

  it('repeats the one letter it has when the name is a single word', () => {
    const singleWordName = 'Ana'
    const expectedInitials = 'AA'

    expect(memberInitials(singleWordName)).toBe(expectedInitials)
  })

  it('returns an empty string for an empty name', () => {
    const emptyName = ''

    expect(memberInitials(emptyName)).toBe(emptyName)
  })
})
