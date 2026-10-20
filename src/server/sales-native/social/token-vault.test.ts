import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { openSocialToken, sealSocialToken } from './token-vault'

const org = '30000000-0000-4000-8000-000000000001'
const integration = '50000000-0000-4000-8000-000000000001'
const other = '50000000-0000-4000-8000-000000000002'

describe('native Social token vault', () => {
  it('seals private tokens with unique nonces and exact integration binding', () => {
    const key = randomBytes(32).toString('base64url')
    const first = sealSocialToken('synthetic-token-only', key, org, integration)
    const second = sealSocialToken('synthetic-token-only', key, org, integration)
    expect(first).not.toBe(second)
    expect(first).not.toContain('synthetic-token-only')
    expect(openSocialToken(first, key, org, integration)).toBe('synthetic-token-only')
    expect(() => openSocialToken(first, key, org, other)).toThrow('SOCIAL_TOKEN_UNAVAILABLE')
    expect(() => openSocialToken(first, randomBytes(32).toString('base64url'), org, integration))
      .toThrow('SOCIAL_TOKEN_UNAVAILABLE')
  })

  it('rejects invalid key material and tampered ciphertext without exposing contents', () => {
    const key = randomBytes(32).toString('base64url')
    expect(() => sealSocialToken('qa', 'short', org, integration)).toThrow('SOCIAL_VAULT_UNAVAILABLE')
    const sealed = sealSocialToken('qa', key, org, integration)
    const parts = sealed.split(':')
    parts[2] = `${parts[2][0] === 'A' ? 'B' : 'A'}${parts[2].slice(1)}`
    expect(() => openSocialToken(parts.join(':'), key, org, integration))
      .toThrow('SOCIAL_TOKEN_UNAVAILABLE')
  })
})
