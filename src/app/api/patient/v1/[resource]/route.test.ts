import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fixtures = vi.hoisted(() => {
  process.env.PATIENT_SALES_ORGANIZATION_ID = '99999999-9999-4999-8999-999999999999'
  process.env.PATIENT_SALES_OWNER_MEMBER_ID = '88888888-8888-4888-8888-888888888888'
  return { queries: [] as Array<{ table: string; filters: Record<string, unknown>; update?: Record<string, unknown> }> }
})

const patients = [
  { handle: `cspt_${'A'.repeat(48)}`, authId: '11111111-1111-4111-8111-111111111111', identityId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', contactId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', email: 'one@example.test', firstName: 'One' },
  { handle: `cspt_${'B'.repeat(48)}`, authId: '22222222-2222-4222-8222-222222222222', identityId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', contactId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', email: 'two@example.test', firstName: 'Two' },
]
const organization = '99999999-9999-4999-8999-999999999999'

vi.mock('@/shared/db/supabaseAdmin', () => ({
  supabaseAdmin: () => ({
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: {
      email: patients.find(patient => patient.authId === id)?.email,
      email_confirmed_at: '2026-10-20T00:00:00.000Z',
    } }, error: null }) } },
    from: (table: string) => {
      const filters: Record<string, unknown> = {}
      const query: { table: string; filters: Record<string, unknown>; update?: Record<string, unknown> } = { table, filters }
      fixtures.queries.push(query)
      const chain = {
        select: () => chain,
        update: (value: Record<string, unknown>) => { query.update = value; return chain },
        eq: (key: string, value: unknown) => { filters[key] = value; return chain },
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => {
          const patient = table === 'sales_patient_sessions'
            ? patients.find(item => createHash('sha256').update(item.handle).digest('hex') === filters.handle_hash)
            : patients.find(item => item.authId === filters.auth_id || item.contactId === filters.id)
          if (!patient) return { data: null, error: null }
          if (table === 'sales_patient_sessions') return { data: { auth_id: patient.authId, expires_at: '2099-01-01T00:00:00.000Z', revoked_at: null }, error: null }
          if (table === 'sales_patient_identities') return { data: { id: patient.identityId, contact_id: patient.contactId, organization_id: organization }, error: null }
          if (table === 'sales_contacts') return { data: { id: patient.contactId, first_name: patient.firstName, last_name: 'Patient', email: patient.email, phone: query.update?.phone ?? null, created_at: '2026-10-20T00:00:00.000Z', source: 'PATIENT_PORTAL', version: 1 }, error: null }
          return { data: null, error: null }
        },
      }
      return chain
    },
  }),
}))

vi.mock('@/shared/db/env.client', () => ({ clientEnv: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.test', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test' } }))
vi.mock('@/shared/db/noStoreFetch', () => ({ noStoreFetch: fetch }))

import { GET, PATCH, POST } from './route'

describe('patient API isolation', () => {
  beforeEach(() => { fixtures.queries.length = 0 })

  it('requires a patient session for profile reads', async () => {
    const response = await GET(new Request('https://app.test/api/patient/v1/profile'), { params: Promise.resolve({ resource: 'profile' }) })
    expect(response.status).toBe(401)
    expect(fixtures.queries).toHaveLength(0)
  })

  it('ignores a caller-supplied contact ID and scopes each profile to its bound identity', async () => {
    for (const patient of patients) {
      const request = new Request(`https://app.test/api/patient/v1/profile?contactId=${patients.find(item => item !== patient)?.contactId}`, {
        headers: { Authorization: `Patient ${patient.handle}` },
      })
      const response = await GET(request, { params: Promise.resolve({ resource: 'profile' }) })
      expect(response.status).toBe(200)
      expect((await response.json()).data.id).toBe(patient.contactId)
      const contactRead = fixtures.queries.filter(query => query.table === 'sales_contacts').at(-1)
      expect(contactRead?.filters).toMatchObject({ id: patient.contactId, organization_id: organization })
    }
  })

  it('rejects a standalone two-month enrollment before any payment or membership write', async () => {
    const response = await POST(new Request('https://app.test/api/patient/v1/enrollment', {
      method: 'POST', headers: { Authorization: `Patient ${patients[0].handle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'ESSENTIAL', type: 'INDIVIDUAL', duration: '2M', idempotencyKey: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }),
    }), { params: Promise.resolve({ resource: 'enrollment' }) })
    expect(response.status).toBe(422)
    expect(fixtures.queries.some(query => ['sales_patient_enrollment_intents', 'sales_payments', 'sales_memberships'].includes(query.table))).toBe(false)
  })

  it('updates only the bound patient contact and rejects administrative fields', async () => {
    const otherContactId = patients[1].contactId
    const request = new Request(`https://app.test/api/patient/v1/profile?contactId=${otherContactId}`, {
      method: 'PATCH', headers: { Authorization: `Patient ${patients[0].handle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '555-0100' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ resource: 'profile' }) })
    expect(response.status).toBe(200)
    expect((await response.json()).data.id).toBe(patients[0].contactId)
    const updated = fixtures.queries.find(query => query.table === 'sales_contacts' && query.update)
    expect(updated?.filters).toMatchObject({ id: patients[0].contactId, organization_id: organization, version: 1 })
    expect(updated?.update).toMatchObject({ phone: '555-0100', version: 2 })
    const rejected = await PATCH(new Request('https://app.test/api/patient/v1/profile', {
      method: 'PATCH', headers: { Authorization: `Patient ${patients[0].handle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '555-0100', email: 'different@example.test' }),
    }), { params: Promise.resolve({ resource: 'profile' }) })
    expect(rejected.status).toBe(422)
  })
})
