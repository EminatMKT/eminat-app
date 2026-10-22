import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

/** Verify the exact raw bytes before JSON parsing or reconciliation. */
export function verifyIntuitSignature(body: Buffer, signature: string | null,
  verifier: string | undefined): boolean {
  if (!signature || !verifier || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false
  const expected = createHmac('sha256', verifier).update(body).digest()
  const received = Buffer.from(signature, 'base64')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export type QboWebhookEntity = { realmId: string; name: 'Customer' | 'Item' | 'Invoice' | 'Payment';
  id: string; operation: string; lastUpdated: string }

export function parseIntuitWebhook(value: unknown): QboWebhookEntity[] {
  if (!value || typeof value !== 'object' || !('eventNotifications' in value) ||
    !Array.isArray(value.eventNotifications)) throw new Error('INVALID_WEBHOOK')
  const result: QboWebhookEntity[] = []
  for (const notification of value.eventNotifications) {
    if (!notification || typeof notification !== 'object' ||
      !/^[0-9]{1,80}$/.test(String(notification.realmId ?? '')) ||
      !Array.isArray(notification.dataChangeEvent?.entities)) throw new Error('INVALID_WEBHOOK')
    for (const entity of notification.dataChangeEvent.entities) {
      if (!['Customer', 'Item', 'Invoice', 'Payment'].includes(entity?.name)) continue
      if (!/^[0-9]{1,80}$/.test(String(entity.id ?? '')) ||
        typeof entity.operation !== 'string' || entity.operation.length > 32 ||
        typeof entity.lastUpdated !== 'string' || !Number.isFinite(Date.parse(entity.lastUpdated)))
        throw new Error('INVALID_WEBHOOK')
      result.push({ realmId: notification.realmId, name: entity.name,
        id: entity.id, operation: entity.operation, lastUpdated: entity.lastUpdated })
    }
  }
  return result
}
