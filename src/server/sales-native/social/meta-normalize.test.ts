import { describe, expect, it } from 'vitest'
import { normalizeMetaWebhook } from './meta-normalize'
import { allowMetaLeadFields, approvedMetaLead, EMC_META_LEAD_POLICY as policy } from './meta-lead-policy'

const now = Math.floor(Date.now() / 1000)
const body = (value: object = {}, page = policy.pageId, time = now) => Buffer.from(JSON.stringify({
  object: 'page', entry: [{ id: page, time, changes: [{ field: 'leadgen', value: {
    leadgen_id: '123456', form_id: policy.formIds[0], ...value,
  } }] }],
}))

describe('EMC Meta Lead Ads boundary', () => {
  it('requires Graph reread and drops every webhook answer and unverified attribution', () => {
    const [event] = normalizeMetaWebhook(body({ field_data: [{ name: 'symptoms', values: ['SYNTHETIC'] }],
      campaign_id: 'fake', organizationId: 'attacker' }))
    expect(event.externalEventId).toBe('leadgen:123456')
    expect(event.normalized).toEqual({ channel: 'page', pageId: policy.pageId,
      externalLeadId: '123456', formId: policy.formIds[0], fields: null, needsLeadFetch: true })
  })
  it('discards DMs and comments entirely, including identifiers and bodies', () => {
    const raw = Buffer.from(JSON.stringify({ object: 'instagram', entry: [{ id: '1234', time: now,
      messaging: [{ sender: { id: 'person' }, message: { mid: 'id', text: 'SYNTHETIC SENSITIVE' } }],
      changes: [{ field: 'comments', value: { comment_id: 'id', message: 'SYNTHETIC SENSITIVE' } }],
    }] }))
    expect(normalizeMetaWebhook(raw)).toEqual([])
  })
  it('rejects mismatched Page IDs and malformed external IDs', () => {
    expect(() => normalizeMetaWebhook(body({ page_id: '999' }))).toThrow('META_PAYLOAD_INVALID')
    expect(() => normalizeMetaWebhook(body({ leadgen_id: '../evil' }))).toThrow('META_PAYLOAD_INVALID')
  })
  it('bounds payload size and event age', () => {
    expect(() => normalizeMetaWebhook(Buffer.from('{'))).toThrow('META_PAYLOAD_INVALID')
    expect(() => normalizeMetaWebhook(Buffer.alloc(1024 * 1024 + 1))).toThrow('META_PAYLOAD_INVALID')
    expect(() => normalizeMetaWebhook(body({}, policy.pageId, now + 3600))).toThrow('META_TIMESTAMP_INVALID')
    expect(() => normalizeMetaWebhook(body({}, policy.pageId, now - 8 * 86400))).toThrow('META_TIMESTAMP_INVALID')
  })
  it('allows only the reviewed Page/form pair', () => {
    expect(approvedMetaLead(policy.pageId, policy.formIds[0])).toBe(true)
    expect(approvedMetaLead('999', policy.formIds[0])).toBe(false)
    for (const form of [...policy.excludedFormIds, '999', undefined])
      expect(approvedMetaLead(policy.pageId, form)).toBe(false)
  })
  it('drops sensitive fields and arbitrary free text', () => {
    expect(allowMetaLeadFields({ full_name: 'Synthetic QA', email: ' QA@example.invalid ',
      phone_number: '+1 (202) 555-0123', preferred_language: 'Español', symptoms: 'SYNTHETIC',
      insurance: 'SYNTHETIC', generic_inquiry: 'SYNTHETIC', company_name: 'SYNTHETIC',
      date_of_birth: '2000-01-01', medication: 'SYNTHETIC' })).toEqual({
      full_name: 'Synthetic QA', email: 'qa@example.invalid', phone_number: '+12025550123', preferred_language: 'es',
    })
  })
  it('accepts a single contact identifier and discards malformed values', () => {
    expect(allowMetaLeadFields({ email: 'qa@example.invalid' })).toEqual({ email: 'qa@example.invalid' })
    expect(allowMetaLeadFields({ phone_number: '2025550123' })).toEqual({ phone_number: '2025550123' })
    expect(allowMetaLeadFields({ email: 'invalid', phone_number: 'short', full_name: 'a\nb',
      preferred_language: 'sensitive free text' })).toEqual({})
  })
})
