import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { SocialWebhookEvent } from './provider'

const value = z.record(z.string(), z.unknown())
const entry = z.object({
  id: z.string().min(1).max(200),
  time: z.number().int().positive(),
  messaging: z.array(value).max(100).optional(),
  changes: z.array(z.object({
    field: z.string().min(1).max(100), value,
  }).passthrough()).max(100).optional(),
}).passthrough()
const envelope = z.object({
  object: z.enum(['page', 'instagram']),
  entry: z.array(entry).min(1).max(100),
}).passthrough()
const leadFields = z.array(z.object({
  name: z.string().min(1).max(200),
  values: z.array(z.union([z.string(), z.number(), z.boolean()])).max(20),
}).passthrough()).max(100)

const text = (value: unknown, max = 500) => typeof value === 'string' ? value.slice(0, max) : ''
function timestamp(value: unknown): string {
  const numeric = Number(value)
  const millis = numeric < 10_000_000_000 ? numeric * 1000 : numeric
  if (!Number.isFinite(millis) || millis <= 0 || millis > Date.now() + 300_000)
    throw new Error('META_TIMESTAMP_INVALID')
  return new Date(millis).toISOString()
}

/** Parse a verified raw body only. Never use this to bypass HMAC verification. */
export function normalizeMetaWebhook(raw: Buffer): SocialWebhookEvent[] {
  if (!Buffer.isBuffer(raw) || !raw.length || raw.length > 1024 * 1024)
    throw new Error('META_PAYLOAD_INVALID')
  let decoded: unknown
  try { decoded = JSON.parse(raw.toString('utf8')) }
  catch { throw new Error('META_PAYLOAD_INVALID') }
  const parsed = envelope.safeParse(decoded)
  if (!parsed.success) throw new Error('META_PAYLOAD_INVALID')
  const result: SocialWebhookEvent[] = []
  for (const item of parsed.data.entry) {
    for (const message of item.messaging ?? []) {
      const payload = message.message
      const sender = message.sender
      const externalId = payload && typeof payload === 'object' && 'mid' in payload
        ? text(payload.mid, 200) : text(message.mid, 200)
      if (!externalId) continue
      result.push({ provider: 'META', externalAssetId: item.id,
        externalEventId: `message:${externalId}`, kind: 'message',
        occurredAt: timestamp(message.timestamp ?? item.time),
        normalized: { channel: parsed.data.object,
          externalSubjectId: sender && typeof sender === 'object' && 'id' in sender
            ? text(sender.id, 200) : '',
          text: payload && typeof payload === 'object' && 'text' in payload
            ? text(payload.text, 10000) : '' },
      })
    }
    for (const change of item.changes ?? []) {
      const data = change.value
      if (change.field === 'leadgen') {
        const externalId = text(data.leadgen_id, 200)
        if (!externalId) continue
        const parsedFields = leadFields.safeParse(data.field_data)
        const fields = parsedFields.success ? Object.fromEntries(parsedFields.data.map(field =>
          [field.name, text(String(field.values[0] ?? ''), 10000)])) : null
        result.push({ provider: 'META', externalAssetId: item.id,
          externalEventId: `leadgen:${externalId}`, kind: 'leadgen',
          occurredAt: timestamp(data.created_time ?? item.time),
          normalized: { externalLeadId: externalId, pageId: item.id,
            formId: text(data.form_id, 200), campaignId: text(data.campaign_id, 200),
            adsetId: text(data.adgroup_id ?? data.adset_id, 200), adId: text(data.ad_id, 200),
            consent: data.consent === true, fields,
            needsLeadFetch: !parsedFields.success },
        })
      } else if (change.field === 'feed' || change.field === 'comments') {
        const externalId = text(data.comment_id ?? data.id, 200)
        if (!externalId) continue
        result.push({ provider: 'META', externalAssetId: item.id,
          externalEventId: `comment:${externalId}`, kind: 'comment',
          occurredAt: timestamp(data.created_time ?? item.time),
          normalized: { channel: parsed.data.object, externalCommentId: externalId,
            externalParentId: text(data.parent_id, 200), externalPostId: text(data.post_id, 200),
            text: text(data.message, 10000) },
        })
      }
    }
    if (!(item.messaging?.length || item.changes?.length)) {
      result.push({ provider: 'META', externalAssetId: item.id,
        externalEventId: `unknown:${createHash('sha256').update(JSON.stringify(item)).digest('hex')}`,
        kind: 'unknown', occurredAt: timestamp(item.time), normalized: {} })
    }
  }
  if (!result.length) throw new Error('META_EVENT_EMPTY')
  return result
}
