import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const VERSION = 'v1'

function keyBytes(encoded: string): Buffer {
  if (!/^[A-Za-z0-9_-]{43,44}$/.test(encoded)) throw new Error('SOCIAL_VAULT_UNAVAILABLE')
  const key = Buffer.from(encoded, 'base64url')
  if (key.length !== 32) throw new Error('SOCIAL_VAULT_UNAVAILABLE')
  return key
}

function context(organizationId: string, integrationId: string): Buffer {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuid.test(organizationId) || !uuid.test(integrationId))
    throw new Error('SOCIAL_VAULT_CONTEXT_INVALID')
  return Buffer.from(`${VERSION}:${organizationId.toLowerCase()}:${integrationId.toLowerCase()}`)
}

/** AES-256-GCM with per-token nonce and tenant/integration binding. */
export function sealSocialToken(token: string, key: string, organizationId: string,
  integrationId: string): string {
  if (!token || token.length > 16384) throw new Error('SOCIAL_TOKEN_INVALID')
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyBytes(key), nonce)
  cipher.setAAD(context(organizationId, integrationId))
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return `${VERSION}:${nonce.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${ciphertext.toString('base64url')}`
}

export function openSocialToken(sealed: string, key: string, organizationId: string,
  integrationId: string): string {
  try {
    const [version, nonceText, tagText, ciphertextText, extra] = sealed.split(':')
    if (version !== VERSION || !nonceText || !tagText || !ciphertextText || extra !== undefined)
      throw new Error()
    const nonce = Buffer.from(nonceText, 'base64url')
    const tag = Buffer.from(tagText, 'base64url')
    if (nonce.length !== 12 || tag.length !== 16) throw new Error()
    const decipher = createDecipheriv('aes-256-gcm', keyBytes(key), nonce)
    decipher.setAAD(context(organizationId, integrationId))
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(Buffer.from(ciphertextText, 'base64url')),
      decipher.final()]).toString('utf8')
  } catch { throw new Error('SOCIAL_TOKEN_UNAVAILABLE') }
}
