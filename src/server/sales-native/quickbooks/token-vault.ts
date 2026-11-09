import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const realmPattern = /^[0-9]{1,80}$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function keyBytes(encoded: string): Buffer {
  if (!/^[A-Za-z0-9_-]{43,44}$/.test(encoded)) throw new Error('QBO_VAULT_UNAVAILABLE')
  const key = Buffer.from(encoded, 'base64url')
  if (key.length !== 32) throw new Error('QBO_VAULT_UNAVAILABLE')
  return key
}

function aad(organizationId: string, realmId: string, kind: 'access' | 'refresh'): Buffer {
  if (!uuidPattern.test(organizationId) || !realmPattern.test(realmId))
    throw new Error('QBO_VAULT_CONTEXT_INVALID')
  return Buffer.from(`qbo-v1:production:${organizationId.toLowerCase()}:${realmId}:${kind}`)
}

/** Encrypted server-only token; bound to one organization, realm, and token kind. */
export function sealQboToken(token: string, key: string, organizationId: string,
  realmId: string, kind: 'access' | 'refresh'): string {
  if (!token || token.length > 16384) throw new Error('QBO_TOKEN_INVALID')
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyBytes(key), nonce)
  cipher.setAAD(aad(organizationId, realmId, kind))
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return `v1:${nonce.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${ciphertext.toString('base64url')}`
}

export function openQboToken(sealed: string, key: string, organizationId: string,
  realmId: string, kind: 'access' | 'refresh'): string {
  try {
    const [version, nonceText, tagText, ciphertextText, extra] = sealed.split(':')
    if (version !== 'v1' || !nonceText || !tagText || !ciphertextText || extra !== undefined)
      throw new Error()
    const nonce = Buffer.from(nonceText, 'base64url')
    const tag = Buffer.from(tagText, 'base64url')
    if (nonce.length !== 12 || tag.length !== 16) throw new Error()
    const decipher = createDecipheriv('aes-256-gcm', keyBytes(key), nonce)
    decipher.setAAD(aad(organizationId, realmId, kind))
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(Buffer.from(ciphertextText, 'base64url')),
      decipher.final()]).toString('utf8')
  } catch { throw new Error('QBO_TOKEN_UNAVAILABLE') }
}
