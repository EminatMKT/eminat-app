import { z } from 'zod'
import type { SocialWebhookEvent } from './provider'

const id = z.string().regex(/^[0-9]{1,30}$/)
const envelope = z.object({ object: z.enum(['page', 'instagram']),
  entry: z.array(z.object({ id, time: z.number().int().positive(),
    changes: z.array(z.object({ field: z.string().max(100),
      value: z.record(z.string(), z.unknown()) })).max(100).optional(),
  })).min(1).max(100),
})
const lead = z.object({ leadgen_id: id, form_id: id, page_id: id.optional(),
  created_time: z.number().int().positive().optional(),
})

/** Lead Ads only. Drop DMs, comments and all supplied answers before persistence.
 * Graph reread is mandatory, even when field_data accompanies a signed webhook. */
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
    for (const change of item.changes ?? []) {
      if (change.field !== 'leadgen' || parsed.data.object !== 'page') continue
      const data = lead.safeParse(change.value)
      if (!data.success || data.data.page_id && data.data.page_id !== item.id)
        throw new Error('META_PAYLOAD_INVALID')
      const millis = (data.data.created_time ?? item.time) * 1000
      if (millis > Date.now() + 300_000 || millis < Date.now() - 7 * 86400_000)
        throw new Error('META_TIMESTAMP_INVALID')
      result.push({ provider: 'META', externalAssetId: item.id,
        externalEventId: `leadgen:${data.data.leadgen_id}`, kind: 'leadgen',
        occurredAt: new Date(millis).toISOString(),
        normalized: { channel: 'page', externalLeadId: data.data.leadgen_id,
          pageId: item.id, formId: data.data.form_id, fields: null, needsLeadFetch: true },
      })
    }
  }
  if (result.length > 100) throw new Error('META_PAYLOAD_INVALID')
  return result
}
