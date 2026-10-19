import { describe, expect, it } from 'vitest'
import { normalizeMetaWebhook } from './meta-normalize'

describe('native Meta webhook normalization', () => {
  const now = Math.floor(Date.now() / 1000)

  it('preserves Lead Ads attribution and marks absent lead fields for fetch', () => {
    const body = Buffer.from(JSON.stringify({ object: 'page', entry: [{ id: 'page-qa', time: now,
      changes: [{ field: 'leadgen', value: { leadgen_id: 'lead-qa', form_id: 'form-qa',
        campaign_id: 'campaign-qa', adgroup_id: 'adset-qa', ad_id: 'ad-qa' } }] }] }))
    const [event] = normalizeMetaWebhook(body)
    expect(event.externalAssetId).toBe('page-qa')
    expect(event.externalEventId).toBe('leadgen:lead-qa')
    expect(event.normalized).toMatchObject({ pageId: 'page-qa', formId: 'form-qa',
      campaignId: 'campaign-qa', adsetId: 'adset-qa', adId: 'ad-qa', needsLeadFetch: true })
  })

  it('normalizes messages and comments with distinct idempotency keys', () => {
    const body = Buffer.from(JSON.stringify({ object: 'instagram', entry: [{ id: 'ig-qa', time: now,
      messaging: [{ sender: { id: 'person-qa' }, message: { mid: 'same-id', text: 'QA' } }],
      changes: [{ field: 'comments', value: { comment_id: 'same-id', message: 'QA comment' } }],
    }] }))
    expect(normalizeMetaWebhook(body).map(event => event.externalEventId))
      .toEqual(['message:same-id', 'comment:same-id'])
  })

  it('uses the recipient and outbound direction for Page message echoes', () => {
    const body = Buffer.from(JSON.stringify({ object: 'page', entry: [{ id: 'page-qa', time: now,
      messaging: [{ sender: { id: 'page-qa' }, recipient: { id: 'person-qa' },
        message: { mid: 'echo-qa', text: 'Reply', is_echo: true } }],
    }] }))
    expect(normalizeMetaWebhook(body)[0].normalized).toMatchObject({
      externalSubjectId: 'person-qa', direction: 'OUTBOUND', text: 'Reply',
    })
  })

  it('rejects malformed, oversized, and future payloads', () => {
    expect(() => normalizeMetaWebhook(Buffer.from('{'))).toThrow('META_PAYLOAD_INVALID')
    expect(() => normalizeMetaWebhook(Buffer.alloc(1024 * 1024 + 1))).toThrow('META_PAYLOAD_INVALID')
    const future = Buffer.from(JSON.stringify({ object: 'page', entry: [{ id: 'page-qa',
      time: Math.floor(Date.now() / 1000) + 3600, changes: [{ field: 'leadgen', value: {
        leadgen_id: 'lead-qa' } }] }] }))
    expect(() => normalizeMetaWebhook(future)).toThrow('META_TIMESTAMP_INVALID')
  })
})
