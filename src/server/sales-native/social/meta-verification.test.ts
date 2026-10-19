import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyMetaChallenge, verifyMetaWebhookSignature } from './meta-verification'

describe('native Meta webhook boundary', () => {
  const secret = 'synthetic-qa-only-secret-12345'
  const raw = Buffer.from('{"object":"page","entry":[]}')

  it('accepts a valid raw-body signature and rejects altered or malformed deliveries', () => {
    const signature = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`
    expect(verifyMetaWebhookSignature(raw, signature, secret)).toBe(true)
    expect(verifyMetaWebhookSignature(Buffer.from('{"object":"page"}'), signature, secret)).toBe(false)
    expect(verifyMetaWebhookSignature(raw, 'sha256=bad', secret)).toBe(false)
    expect(verifyMetaWebhookSignature(raw, signature, '')).toBe(false)
  })

  it('requires the exact private challenge token', () => {
    expect(verifyMetaChallenge('subscribe', 'qa-token', '12345', 'qa-token')).toBe('12345')
    expect(() => verifyMetaChallenge('subscribe', 'wrong', '12345', 'qa-token')).toThrow('META_CHALLENGE_DENIED')
  })
})
