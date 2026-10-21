import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fixtures = vi.hoisted(() => {
  process.env.PATIENT_SALES_ORGANIZATION_ID = '99999999-9999-4999-8999-999999999999'
  process.env.PATIENT_SALES_OWNER_MEMBER_ID = '88888888-8888-4888-8888-888888888888'
  return { queries: [] as Array<{ table: string; filters: Record<string, unknown>; update?: Record<string, unknown> }>, synthetic: false }
})

const patients = [
  { handle: `cspt_${'A'.repeat(48)}`, authId: '11111111-1111-4111-8111-111111111111', identityId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', contactId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', email: 'one@example.test', firstName: 'One' },
  { handle: `cspt_${'B'.repeat(48)}`, authId: '22222222-2222-4222-8222-222222222222', identityId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', contactId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', email: 'two@example.test', firstName: 'Two' },
]
const organization = '99999999-9999-4999-8999-999999999999'
const memberships = patients.map((patient, index) => ({
  id: index ? 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' : 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  primary_contact_id: patient.contactId, code: `QA-${index + 1}`,
  first_name: patient.firstName, last_name: 'Patient', plan: 'ESSENTIAL',
  membership_type: 'FAMILY', duration: 'MONTHLY', issued_at: '2026-10-20',
  expires_at: '2026-11-20', status: 'ACTIVE',
}))
const dependant = { id: 'abababab-abab-4bab-8bab-abababababab', first_name: 'Child', last_name: 'Patient' }
const contactRows = [...patients.map(patient => ({ id: patient.contactId,
  first_name: patient.firstName, last_name: 'Patient' })), dependant]

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
        in: (key: string, value: unknown[]) => { filters[key] = value; return chain },
        order: () => chain,
        limit: () => chain,
        then: (resolve: (value: unknown) => unknown) => {
          const data = table === 'sales_household_members' ? [
            { id: '12121212-1212-4212-8212-121212121212', contact_id: patients[0].contactId,
              relationship: 'PRIMARY', status: 'ACTIVE', member_index: 1 },
            { id: '13131313-1313-4313-8313-131313131313', contact_id: dependant.id,
              relationship: 'CHILD', status: 'ACTIVE', member_index: 2 },
          ].filter(item => filters.membership_id === memberships[0].id) :
            table === 'sales_contacts' ? contactRows
              .filter(item => (filters.id as string[]).includes(item.id)) : []
          return Promise.resolve({ data, error: null }).then(resolve)
        },
        maybeSingle: async () => {
          if (table === 'sales_memberships') return { data: filters.is_demo === fixtures.synthetic
            ? memberships.find(item => item.primary_contact_id === filters.primary_contact_id) ?? null : null, error: null }
          const patient = table === 'sales_patient_sessions'
            ? patients.find(item => createHash('sha256').update(item.handle).digest('hex') === filters.handle_hash)
            : patients.find(item => item.authId === filters.auth_id || item.contactId === filters.id)
          if (!patient) return { data: null, error: null }
          if (table === 'sales_patient_sessions') return { data: { auth_id: patient.authId, expires_at: '2099-01-01T00:00:00.000Z', revoked_at: null }, error: null }
          if (table === 'sales_patient_identities') return { data: { id: patient.identityId, contact_id: patient.contactId, organization_id: organization }, error: null }
          if (table === 'sales_contacts') return { data: { id: patient.contactId, first_name: patient.firstName, last_name: 'Patient', email: patient.email, phone: query.update?.phone ?? null, address: query.update?.address ?? null, created_at: '2026-10-20T00:00:00.000Z', source: 'PATIENT_PORTAL', version: 1 }, error: null }
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
  beforeEach(() => { fixtures.queries.length = 0; fixtures.synthetic = false })

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

  it('saves a validated address only on the authenticated patient contact', async () => {
    const address = { street: '100 Test St', line2: '', city: 'Test City', state: 'FL', postalCode: '33301', country: 'United States' }
    const response = await PATCH(new Request(`https://app.test/api/patient/v1/profile?contactId=${patients[1].contactId}`, {
      method: 'PATCH', headers: { Authorization: `Patient ${patients[0].handle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    }), { params: Promise.resolve({ resource: 'profile' }) })
    expect(response.status).toBe(200)
    const updated = fixtures.queries.find(query => query.table === 'sales_contacts' && query.update)
    expect(updated?.filters).toMatchObject({ id: patients[0].contactId, organization_id: organization, version: 1 })
    expect(updated?.update).toMatchObject({ address, version: 2 })
    expect(updated?.update).not.toHaveProperty('phone')
    fixtures.queries.length = 0
    for (const invalidAddress of [{ ...address, street: '' }, { ...address, city: '' },
      { ...address, country: '' }, { ...address, admin: 'true' }, { ...address, postalCode: 'x'.repeat(41) }]) {
      const rejected = await PATCH(new Request('https://app.test/api/patient/v1/profile', {
        method: 'PATCH', headers: { Authorization: `Patient ${patients[0].handle}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: invalidAddress }),
      }), { params: Promise.resolve({ resource: 'profile' }) })
      expect(rejected.status).toBe(422)
    }
    expect(fixtures.queries.some(query => query.table === 'sales_contacts')).toBe(false)
  })

  it('reads household only through the authenticated primary contact and tenant', async () => {
    const response = await GET(new Request(`https://app.test/api/patient/v1/household?contactId=${patients[1].contactId}`, {
      headers: { Authorization: `Patient ${patients[0].handle}` },
    }), { params: Promise.resolve({ resource: 'household' }) })
    expect(response.status).toBe(200)
    expect((await response.json()).data).toMatchObject([
      { first_name: 'One', relationship: 'PRIMARY', is_primary: true },
      { first_name: 'Child', relationship: 'CHILD', is_primary: false },
    ])
    expect(fixtures.queries.find(query => query.table === 'sales_memberships')?.filters)
      .toMatchObject({ organization_id: organization, primary_contact_id: patients[0].contactId, is_demo: false })
    expect(fixtures.queries.find(query => query.table === 'sales_household_members')?.filters)
      .toMatchObject({ organization_id: organization, membership_id: memberships[0].id })
  })

  it('counts only active household members for the bound membership', async () => {
    const response = await GET(new Request('https://app.test/api/patient/v1/membership', {
      headers: { Authorization: `Patient ${patients[0].handle}` },
    }), { params: Promise.resolve({ resource: 'membership' }) })
    expect(response.status).toBe(200)
    expect((await response.json()).data.covered_members).toBe(2)
    expect(fixtures.queries.find(query => query.table === 'sales_household_members')?.filters)
      .toMatchObject({ organization_id: organization, membership_id: memberships[0].id, status: 'ACTIVE' })
  })

  it('returns only the bound membership PDF and never trusts a caller membership ID', async () => {
    const response = await GET(new Request(`https://app.test/api/patient/v1/membershippdf?membershipId=${memberships[1].id}`, {
      headers: { Authorization: `Patient ${patients[0].handle}` },
    }), { params: Promise.resolve({ resource: 'membershippdf' }) })
    expect(response.status).toBe(422)
    expect(fixtures.queries.some(query => query.table === 'sales_memberships')).toBe(false)
    const own = await GET(new Request('https://app.test/api/patient/v1/membershippdf?download=1', {
      headers: { Authorization: `Patient ${patients[0].handle}` },
    }), { params: Promise.resolve({ resource: 'membershippdf' }) })
    expect(own.status).toBe(200)
    expect(own.headers.get('Content-Disposition')).toContain('attachment')
    expect(own.headers.get('Cache-Control')).toBe('private, no-store')
    expect(Buffer.from(await own.arrayBuffer()).subarray(0, 4).toString()).toBe('%PDF')
    expect(fixtures.queries.find(query => query.table === 'sales_memberships')?.filters)
      .toMatchObject({ organization_id: organization, primary_contact_id: patients[0].contactId, is_demo: false })
  })

  it('shows a synthetic QA membership only to its bound patient when no real membership exists', async () => {
    fixtures.synthetic = true
    const own = await GET(new Request('https://app.test/api/patient/v1/membership', {
      headers: { Authorization: `Patient ${patients[0].handle}` },
    }), { params: Promise.resolve({ resource: 'membership' }) })
    expect(own.status).toBe(200)
    expect((await own.json()).data).toMatchObject({ code: 'QA-1', qa_synthetic: true })
    const queries = fixtures.queries.filter(query => query.table === 'sales_memberships')
    expect(queries).toHaveLength(2)
    expect(queries[0].filters).toMatchObject({ primary_contact_id: patients[0].contactId, is_demo: false })
    expect(queries[1].filters).toMatchObject({ primary_contact_id: patients[0].contactId, is_demo: true })
    fixtures.queries.length = 0
    const other = await GET(new Request('https://app.test/api/patient/v1/membership', {
      headers: { Authorization: `Patient ${patients[1].handle}` },
    }), { params: Promise.resolve({ resource: 'membership' }) })
    expect((await other.json()).data.code).toBe('QA-2')
    expect(fixtures.queries.filter(query => query.table === 'sales_memberships')
      .every(query => query.filters.primary_contact_id === patients[1].contactId)).toBe(true)
    const pdf = await GET(new Request('https://app.test/api/patient/v1/membershippdf', {
      headers: { Authorization: `Patient ${patients[0].handle}` },
    }), { params: Promise.resolve({ resource: 'membershippdf' }) })
    expect(pdf.status).toBe(200)
    const pdfText = Buffer.from(await pdf.arrayBuffer()).toString('latin1')
    expect(pdfText).not.toContain('100 Test St')
  })
})
