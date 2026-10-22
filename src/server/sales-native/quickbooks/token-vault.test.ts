import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { openQboToken, sealQboToken } from './token-vault'

const org = '30000000-0000-4000-8000-000000000001'
const other = '30000000-0000-4000-8000-000000000002'

describe('LILLY QBO token vault', () => {
  it('binds each ciphertext to its organization, realm, and token kind', () => {
    const key = randomBytes(32).toString('base64url')
    const sealed = sealQboToken('synthetic-private-token',key,org,'123','refresh')
    expect(sealed).not.toContain('synthetic-private-token')
    expect(openQboToken(sealed,key,org,'123','refresh'))
      .toBe('synthetic-private-token')
    expect(() => openQboToken(sealed,key,other,'123','refresh'))
      .toThrow('QBO_TOKEN_UNAVAILABLE')
    expect(() => openQboToken(sealed,key,org,'456','refresh'))
      .toThrow('QBO_TOKEN_UNAVAILABLE')
    expect(() => openQboToken(sealed,key,org,'123','access'))
      .toThrow('QBO_TOKEN_UNAVAILABLE')
  })
})
