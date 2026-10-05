import { describe, it, expect } from 'vitest'
import { ADMIN_ERRORS } from '@/shared/errors'
import CREATE_CODES from '.'

const codes = Object.values(CREATE_CODES)

describe('CREATE_CODES', () => {
  it.each(codes)('%s is a key of ADMIN_ERRORS, so respond finds its text', code => {
    expect(ADMIN_ERRORS).toHaveProperty(code)
  })
  it('no two outcomes share a code', () => {
    expect(new Set(codes).size).toBe(codes.length)
  })
})
