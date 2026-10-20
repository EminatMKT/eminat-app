import { createHmac, timingSafeEqual } from 'node:crypto'

/** Verify the raw body before JSON parsing or persistence. Never log the secret. */
export function verifyMetaWebhookSignature(raw: Buffer, signature: unknown, appSecret: string): boolean {
  if (!Buffer.isBuffer(raw) || raw.length === 0 || raw.length > 1024 * 1024 ||
      typeof signature !== 'string' || !/^sha256=[a-f0-9]{64}$/.test(signature) ||
      !appSecret || appSecret.length < 16) return false
  const expected = createHmac('sha256', appSecret).update(raw).digest()
  const actual = Buffer.from(signature.slice(7), 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function verifyMetaChallenge(mode: unknown, token: unknown, challenge: unknown, verifyToken: string): string {
  const supplied = typeof token === 'string' ? Buffer.from(token) : Buffer.alloc(0)
  const expected = Buffer.from(verifyToken)
  if (mode !== 'subscribe' || typeof token !== 'string' ||
      typeof challenge !== 'string' || challenge.length === 0 || challenge.length > 2048 ||
      !verifyToken || supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected))
    throw new Error('META_CHALLENGE_DENIED')
  return challenge
}
