import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fixtures = vi.hoisted(() => {
  process.env.PATIENT_SALES_ORGANIZATION_ID = '99999999-9999-4999-8999-999999999999'
  process.env.PATIENT_SALES_OWNER_MEMBER_ID = '88888888-8888-4888-8888-888888888888'
  return { queries: [] as Array<{ table: string; filters: Record<string, unknown>; update?: Record<string, unknown> }>,
    rpcCalls: [] as Array<{ name: string; args: Record<string, unknown> }>, synthetic: false,
    draftsEnabled: false, emailConfigured: true, registrationAdmitted: true,
    canRecoverRegistration: false,
    signupErrorCode: null as string | null,
    signupLinks: [] as Array<{ type: string; email: string; password?: string; options: {
      redirectTo: string; data?: { corazon_patient_signup: boolean } } }>,
    verificationEmails: [] as Array<{ recipient: string; actionUrl: string }> }
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
    rpc: async (name: string, args: Record<string, unknown>) => {
      fixtures.rpcCalls.push({ name, args })
      if (name === 'native_sales_patient_registration_admit')
        return { data: fixtures.registrationAdmitted, error: null }
      if (name === 'native_sales_patient_registration_can_recover')
        return { data: fixtures.canRecoverRegistration, error: null }
      return { data: { status: 'CHANGE_REQUESTED' }, error: null }
    },
    auth: { admin: { generateLink: async (args: { type: string; email: string; password?: string; options: {
      redirectTo: string; data?: { corazon_patient_signup: boolean } } }) => {
      fixtures.signupLinks.push(args)
      if (fixtures.signupErrorCode && args.type === 'signup') return { data: { properties: null },
        error: { code: fixtures.signupErrorCode } }
      return { data: { properties: { action_link: 'https://ruedelunbtaomhrzgelc.supabase.co/auth/v1/verify?token=secret' } }, error: null }
    }, getUserById: async (id: string) => ({ data: { user: {
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
          const data = table === 'sales_patient_family_draft_members' ?
            [{ id: '33333333-3333-4333-8333-333333333333', first_name: 'QA',
              last_name: 'Child', date_of_birth: '2015-01-02', relationship: 'CHILD', status: 'DRAFT' }]
              .filter(() => fixtures.draftsEnabled && filters.patient_identity_id === patients[0].identityId) :
            table === 'sales_household_members' ? [
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
          if (table === 'sales_patient_enrollment_intents' && fixtures.draftsEnabled)
            return { data: { id: '44444444-4444-4444-8444-444444444444',
              opportunity_id: '55555555-5555-4555-8555-555555555555' }, error: null }
          if (table === 'sales_patient_qbo_manual' && fixtures.draftsEnabled)
            return { data: null, error: null }
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
vi.mock('@/server/sales-native/patient-email-delivery', () => ({
  patientEmailConfigured: () => fixtures.emailConfigured,
  sendPatientVerification: async (_eventId: string, recipient: string, actionUrl: string) => {
    fixtures.verificationEmails.push({ recipient, actionUrl })
    return { status: 'SENT' }
  },
  sendPatientWelcome: async () => ({ status: 'SENT' }),
}))

import { GET, PATCH, POST } from './route'

describe('patient API isolation', () => {
  beforeEach(() => { fixtures.queries.length = 0; fixtures.rpcCalls.length = 0;
    fixtures.synthetic = false; fixtures.draftsEnabled = false;
    fixtures.emailConfigured = true; fixtures.registrationAdmitted = true;
    fixtures.canRecoverRegistration = false; fixtures.signupErrorCode = null;
    fixtures.signupLinks.length = 0; fixtures.verificationEmails.length = 0 })

  it('generates a patient-only confirmation link and sends it with the patient brand', async () => {
    const response = await POST(new Request('https://app.test/api/patient/v1/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient@example.test', password: 'an-owner-entered-password' }),
    }), { params: Promise.resolve({ resource: 'register' }) })
    expect(response.status).toBe(202)
    expect(fixtures.signupLinks).toEqual([{ type: 'signup', email: 'patient@example.test',
      password: 'an-owner-entered-password', options: {
        redirectTo: 'https://portal.corazonsalud.health/login',
        data: { corazon_patient_signup: true },
      } }])
    expect(fixtures.verificationEmails).toEqual([{ recipient: 'patient@example.test',
      actionUrl: 'https://ruedelunbtaomhrzgelc.supabase.co/auth/v1/verify?token=secret' }])
    expect(fixtures.rpcCalls[0]).toMatchObject({ name: 'native_sales_patient_registration_admit',
      args: { p_email_digest: createHash('sha256').update('patient@example.test').digest('hex'),
        p_ip_digest: null } })
  })

  it('rejects a limited signup before creating an Auth account or sending mail', async () => {
    fixtures.registrationAdmitted = false
    const response = await POST(new Request('https://app.test/api/patient/v1/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient@example.test', password: 'an-owner-entered-password' }),
    }), { params: Promise.resolve({ resource: 'register' }) })
    expect(response.status).toBe(429)
    expect(fixtures.signupLinks).toHaveLength(0)
    expect(fixtures.verificationEmails).toHaveLength(0)
  })

  it('does not disclose an existing account or send another confirmation', async () => {
    fixtures.signupErrorCode = 'user_already_exists'
    const response = await POST(new Request('https://app.test/api/patient/v1/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient@example.test', password: 'an-owner-entered-password' }),
    }), { params: Promise.resolve({ resource: 'register' }) })
    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ status: 'CHECK_EMAIL' })
    expect(fixtures.verificationEmails).toHaveLength(0)
  })

  it('recovers only an existing unconfirmed Portal account with a branded link', async () => {
    fixtures.signupErrorCode = 'user_already_exists'
    fixtures.canRecoverRegistration = true
    const response = await POST(new Request('https://app.test/api/patient/v1/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient@example.test', password: 'an-owner-entered-password' }),
    }), { params: Promise.resolve({ resource: 'register' }) })
    expect(response.status).toBe(202)
    expect(fixtures.signupLinks.map(link => link.type)).toEqual(['signup', 'magiclink'])
    expect(fixtures.verificationEmails).toHaveLength(1)
  })

  it('does not create an Auth account when the patient sender is unavailable', async () => {
    fixtures.emailConfigured = false
    const response = await POST(new Request('https://app.test/api/patient/v1/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient@example.test', password: 'an-owner-entered-password' }),
    }), { params: Promise.resolve({ resource: 'register' }) })
    expect(response.status).toBe(503)
    expect(fixtures.signupLinks).toHaveLength(0)
  })

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

  it('creates an enrollment only through the atomic identity-scoped Opportunity RPC', async () => {
    const response = await POST(new Request('https://app.test/api/patient/v1/enrollment', {
      method: 'POST', headers: { Authorization: `Patient ${patients[0].handle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'ESSENTIAL', type: 'FAMILY', duration: 'MONTHLY',
        idempotencyKey: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }),
    }), { params: Promise.resolve({ resource: 'enrollment' }) })
    expect(response.status).toBe(201)
    expect(fixtures.rpcCalls).toEqual([{ name: 'native_sales_patient_enroll', args: {
      p_identity_id: patients[0].identityId, p_plan: 'ESSENTIAL',
      p_type: 'FAMILY', p_duration: 'MONTHLY',
      p_request_key: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    } }])
    expect(fixtures.queries.some(query => query.table === 'sales_patient_enrollment_intents')).toBe(false)
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

  it('rejects a household PDF member ID outside the authenticated membership', async () => {
    const otherMemberId = '99999999-9999-4999-8999-999999999998'
    const response = await GET(new Request(`https://app.test/api/patient/v1/membershippdf?memberId=${otherMemberId}`, {
      headers: { Authorization: `Patient ${patients[0].handle}` },
    }), { params: Promise.resolve({ resource: 'membershippdf' }) })
    expect(response.status).toBe(404)
    expect(fixtures.queries.find(query => query.table === 'sales_household_members')?.filters)
      .toMatchObject({ id: otherMemberId, membership_id: memberships[0].id, organization_id: organization })
  })

  it('does not accept selection changes without the bound patient session', async () => {
    const response = await POST(new Request('https://app.test/api/patient/v1/selection', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'CANCEL', idempotencyKey: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }),
    }), { params: Promise.resolve({ resource: 'selection' }) })
    expect(response.status).toBe(401)
    expect(fixtures.queries.every(query => query.table === 'sales_patient_sessions')).toBe(true)
    expect(fixtures.rpcCalls).toHaveLength(0)
  })

  it('uses the authenticated identity for changes and ignores caller-supplied identity IDs', async () => {
    const response = await POST(new Request('https://app.test/api/patient/v1/selection', {
      method: 'POST', headers: { Authorization: `Patient ${patients[0].handle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'CHANGE', plan: 'PLUS', type: 'FAMILY', duration: '3M',
        idempotencyKey: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        identityId: patients[1].identityId }),
    }), { params: Promise.resolve({ resource: 'selection' }) })
    expect(response.status).toBe(200)
    expect(fixtures.rpcCalls).toHaveLength(1)
    expect(fixtures.rpcCalls[0]).toMatchObject({ name: 'native_sales_patient_selection_action',
      args: { p_identity_id: patients[0].identityId, p_action: 'CHANGE', p_plan: 'PLUS', p_type: 'FAMILY' } })
  })

  it('removes a dependant only through the bound patient identity', async () => {
    const body = { memberId: '13131313-1313-4313-8313-131313131313',
      idempotencyKey: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }
    const unauthenticated = await POST(new Request('https://app.test/api/patient/v1/householdremove', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }), { params: Promise.resolve({ resource: 'householdremove' }) })
    expect(unauthenticated.status).toBe(401)
    expect(fixtures.rpcCalls).toHaveLength(0)
    const authenticated = await POST(new Request('https://app.test/api/patient/v1/householdremove', {
      method: 'POST', headers: { Authorization: `Patient ${patients[0].handle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }), { params: Promise.resolve({ resource: 'householdremove' }) })
    expect(authenticated.status).toBe(200)
    expect(fixtures.rpcCalls[0]).toMatchObject({ name: 'native_sales_patient_remove_family_member', args: {
      p_identity_id: patients[0].identityId, p_household_member_id: body.memberId,
      p_owner_member_id: '88888888-8888-4888-8888-888888888888',
    } })
    fixtures.rpcCalls.length = 0
    const extraFields = await POST(new Request('https://app.test/api/patient/v1/householdremove', {
      method: 'POST', headers: { Authorization: `Patient ${patients[0].handle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, patientIdentityId: patients[1].identityId }),
    }), { params: Promise.resolve({ resource: 'householdremove' }) })
    expect(extraFields.status).toBe(422)
    expect(fixtures.rpcCalls).toHaveLength(0)
  })

  it('prepares a dependant only for the authenticated identity and rejects caller identity overrides', async () => {
    const url = 'https://app.test/api/patient/v1/familydraft'
    const payload = { action: 'ADD', firstName: 'QA', lastName: 'Dependant',
      dateOfBirth: '2015-01-02', relationship: 'CHILD',
      idempotencyKey: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }
    const anonymous = await POST(new Request(url, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
    { params: Promise.resolve({ resource: 'familydraft' }) })
    expect(anonymous.status).toBe(401)
    expect(fixtures.rpcCalls).toHaveLength(0)
    const forbidden = await POST(new Request(url, { method: 'POST',
      headers: { Authorization: `Patient ${patients[0].handle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, patientIdentityId: patients[1].identityId }) }),
    { params: Promise.resolve({ resource: 'familydraft' }) })
    expect(forbidden.status).toBe(422)
    expect(fixtures.rpcCalls).toHaveLength(0)
    const own = await POST(new Request(url, { method: 'POST',
      headers: { Authorization: `Patient ${patients[0].handle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload) }),
    { params: Promise.resolve({ resource: 'familydraft' }) })
    expect(own.status).toBe(201)
    expect(fixtures.rpcCalls[0]).toMatchObject({ name: 'native_sales_patient_family_draft_action',
      args: { p_identity_id: patients[0].identityId, p_action: 'ADD', p_relationship: 'CHILD' } })
  })

  it('reads prepared family members only for the bound identity', async () => {
    fixtures.draftsEnabled = true
    const response = await GET(new Request('https://app.test/api/patient/v1/familydraft', {
      headers: { Authorization: `Patient ${patients[0].handle}` },
    }), { params: Promise.resolve({ resource: 'familydraft' }) })
    expect(response.status).toBe(200)
    expect((await response.json()).data).toMatchObject({ capacityUsed: 2, locked: false,
      members: [{ first_name: 'QA', relationship: 'CHILD' }] })
    expect(fixtures.queries.find(query => query.table === 'sales_patient_enrollment_intents')?.filters)
      .toMatchObject({ organization_id: organization, patient_identity_id: patients[0].identityId,
        membership_type: 'FAMILY' })
    expect(fixtures.queries.find(query => query.table === 'sales_patient_family_draft_members')?.filters)
      .toMatchObject({ organization_id: organization, patient_identity_id: patients[0].identityId,
        enrollment_intent_id: '44444444-4444-4444-8444-444444444444', status: 'DRAFT' })
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
