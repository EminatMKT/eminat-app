import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { cleanupApprovedMetaFixture, createApprovedLocalFixture } from './support/approved-local-fixture'

let application: string | undefined
const database = createApprovedLocalFixture(() => process.env, () => application)
const password = 'synthetic-meta-local-only-12345'
const suffix = randomUUID()
const org = randomUUID(), foreignOrg = randomUUID()
const company = `META_REST_A_${suffix}`, hiddenCompany = `META_REST_B_${suffix}`
const foreignCompany = `META_REST_C_${suffix}`
const secretMarker = `synthetic-private-${suffix}`
const authorizerFk = 'sales_members_user_id_auth_id_fkey'
const people = [
  { key: 'authorizer', first: 'Actual', last: 'Authorizer', member: randomUUID() },
  { key: 'approver', first: 'Different', last: 'Approver', member: randomUUID() },
  { key: 'noaccess', first: 'No', last: 'Company', member: randomUUID() },
  { key: 'seller', first: 'Restricted', last: 'Seller', member: randomUUID() },
].map(p => ({ ...p, email: `meta-rest-${p.key}-${suffix}@eminat.net`, user: '', auth: '', token: '' }))
const foreignMember = randomUUID()
const connections = [
  { organization: org, company, member: people[0].member },
  { organization: org, company: hiddenCompany, member: people[1].member },
  { organization: foreignOrg, company: foreignCompany, member: foreignMember },
].map(c => ({ ...c, integration: randomUUID(), grant: randomUUID(), account: randomUUID(), asset: randomUUID() }))

async function rest(table: string, method: string, body?: object, query = '') {
  const response = await database.request(`/rest/v1/${table}${query}`, {
    method, headers: { Prefer: 'return=minimal' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(`LOCAL_META_FIXTURE_${table}_${response.status}`)
}

// This is the existing database-backed E2E suite: real GoTrue, route and PostgREST.
// No page.route interception, provider calls, migration application or provider enablement.
test.beforeAll(async ({ baseURL }) => {
  application = baseURL
  await database.approve()
  const approvedAt = new Date().toISOString()
  for (const person of people) {
    const created = await database.request('/auth/v1/admin/users', { method: 'POST',
      body: JSON.stringify({ email: person.email, password, email_confirm: true }) })
    expect(created.ok).toBe(true)
    const identity = await created.json() as { id: string }
    person.auth = identity.id
    const profile = await database.request('/rest/v1/usuarios?on_conflict=email', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ auth_id: person.auth, email: person.email, rol: 'sin_asignar',
        nombre: person.first, apellido: person.last, validado: true, activo: true }),
    })
    expect(profile.ok).toBe(true)
    const profiles = await profile.json() as { id: string }[]
    person.user = profiles[0].id
    const login = await database.request('/auth/v1/token?grant_type=password', {
      method: 'POST', body: JSON.stringify({ email: person.email, password }),
    })
    expect(login.status).toBe(200)
    const session = await login.json() as { access_token: string }
    expect(typeof session.access_token).toBe('string')
    person.token = session.access_token
  }
  const approver = people[1].user
  for (const id of [org, foreignOrg]) await rest('sales_organizations', 'POST', {
    id, code: `meta-rest-${id}`, name: `Synthetic Meta REST ${id}`, status: 'active',
    approved_by: approver, approved_at: approvedAt,
  })
  for (const person of people) await rest('sales_members', 'POST', {
    id: person.member, organization_id: org, user_id: person.user, auth_id: person.auth,
    display_name: null, role: person.key === 'seller' ? 'SELLER' : 'ADMINISTRATOR', status: 'active',
    evidence_ref: 'synthetic PostgREST regression', approved_by: approver, approved_at: approvedAt,
  })
  await rest('sales_members', 'POST', { id: foreignMember, organization_id: foreignOrg,
    user_id: approver, auth_id: people[1].auth, role: 'ADMINISTRATOR', status: 'active',
    evidence_ref: 'synthetic PostgREST regression', approved_by: approver, approved_at: approvedAt })
  for (const c of connections) {
    await rest('empresas', 'POST', { codigo: c.company, nombre: c.company, color: '#123456', activo: true })
    await rest('sales_social_company_bindings', 'POST', { organization_id: c.organization,
      company_code: c.company, approved_by: approver, evidence_ref: 'synthetic PostgREST regression' })
  }
  for (const [user, code] of [[people[0].user, company], [approver, hiddenCompany],
    [approver, foreignCompany], [people[3].user, company]]) await rest('usuario_empresas_acceso', 'POST', {
    usuario_id: user, empresa_codigo: code,
  })
  for (const c of connections) {
    await rest('sales_social_grants', 'POST', { id: c.grant, organization_id: c.organization,
      company_code: c.company, authorizer_member_id: c.member, meta_user_id: `synthetic-${c.grant}`,
      app_id: 'synthetic-app', token_ciphertext: secretMarker, expires_at: new Date(Date.now() + 3600000).toISOString(),
      permissions: ['pages_show_list'], status: 'ACTIVE' })
    await rest('sales_social_integrations', 'POST', { id: c.integration, organization_id: c.organization,
      company_code: c.company, provider_code: 'META', status: 'CONNECTED', grant_id: c.grant,
      granted_permissions: ['pages_show_list'], created_by: c.member, updated_by: c.member })
    await rest('sales_social_accounts', 'POST', { id: c.account, organization_id: c.organization,
      company_code: c.company, integration_id: c.integration, external_account_id: c.account, account_type: 'connection' })
    await rest('sales_social_assets', 'POST', { id: c.asset, organization_id: c.organization,
      company_code: c.company, account_id: c.account, external_asset_id: `synthetic-${c.asset}`,
      asset_type: 'page', display_name: c.company, status: 'READY', webhook_status: 'INGESTION_DISABLED',
      default_owner_member_id: c.member, token_ciphertext: secretMarker })
  }
})

test.afterAll(async () => cleanupApprovedMetaFixture(database, async () => {
  // Delete only this run's synthetic records, including partial setup after a failure.
  for (const c of connections) {
    await rest('sales_social_assets', 'DELETE', undefined, `?id=eq.${c.asset}`)
    await rest('sales_social_accounts', 'DELETE', undefined, `?id=eq.${c.account}`)
    await rest('sales_social_integrations', 'DELETE', undefined, `?id=eq.${c.integration}`)
    await rest('sales_social_grants', 'DELETE', undefined, `?id=eq.${c.grant}`)
    await rest('sales_social_company_bindings', 'DELETE', undefined,
      `?organization_id=eq.${c.organization}&company_code=eq.${c.company}`)
    await rest('usuario_empresas_acceso', 'DELETE', undefined, `?empresa_codigo=eq.${c.company}`)
    await rest('empresas', 'DELETE', undefined, `?codigo=eq.${c.company}`)
  }
  for (const id of [...people.map(p => p.member), foreignMember])
    await rest('sales_members', 'DELETE', undefined, `?id=eq.${id}`)
  for (const id of [org, foreignOrg]) await rest('sales_organizations', 'DELETE', undefined, `?id=eq.${id}`)
  for (const person of people) {
    if (person.user) {
      for (const table of ['marcaciones', 'historial', 'notificaciones', 'slots_calendario'])
        await rest(table, 'DELETE', undefined, `?usuario_id=eq.${person.user}`)
      await rest('usuarios', 'DELETE', undefined, `?id=eq.${person.user}`)
    }
    if (person.auth) {
      const removed = await database.request(`/auth/v1/admin/users/${person.auth}`, { method: 'DELETE' })
      expect(removed.ok).toBe(true)
      const absent = await database.request(`/auth/v1/admin/users/${person.auth}`)
      expect(absent.status).toBe(404)
    }
  }
  // Read back the real local database after cleanup, not just the HTTP status.
  const remaining = await database.request(`/rest/v1/sales_social_grants?id=in.(${connections.map(c => c.grant).join(',')})&select=id`)
  expect(await remaining.json()).toEqual([])
}))

async function endpoint(request: APIRequestContext, person = people[0], organization = org) {
  database.assertApproved()
  return request.get('/api/sales-native/social/connections', { headers: {
    Authorization: `Bearer ${person.token}`, 'X-Sales-Organization-Id': organization,
  } })
}

test('real PostgREST identifies the authorizer FK and rejects the ambiguous predecessor', async () => {
  const response = await database.request('/rest/v1/sales_social_grants?select=id,sales_members(usuarios(nombre,apellido))')
  expect(response.status).toBe(300)
  const error = await response.json() as { code: string; details: { relationship: string }[] }
  expect(error.code).toBe('PGRST201')
  const relationships = error.details.map(d => d.relationship).join('\n')
  expect(relationships).toContain(`${authorizerFk} using sales_members(user_id, auth_id) and usuarios(id, auth_id)`)
  expect(relationships).toContain('sales_members_approved_by_fkey')
})

test('real endpoint returns authorizer rather than approver and only permitted company metadata', async ({ request }) => {
  const response = await endpoint(request)
  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control'].split(',').map(value => value.trim())).toContain('no-store')
  const payload = await response.json()
  expect(payload.data.companies.map((c: { code: string }) => c.code)).toEqual([company])
  expect(payload.data.integrations).toHaveLength(1)
  expect(payload.data.integrations[0]).toMatchObject({ id: connections[0].integration,
    company_code: company, grant: { id: connections[0].grant, authorizer_name: 'Actual Authorizer' } })
  expect(payload.data.assets.map((a: { id: string }) => a.id)).toEqual([connections[0].asset])
  expect(payload.data.ingestionEnabled).toBe(false)
  const serialized = JSON.stringify(payload)
  for (const forbidden of ['PGRST201', 'Different Approver', secretMarker, 'token_ciphertext',
    'access_token', hiddenCompany, foreignCompany, connections[1].grant, connections[2].grant])
    expect(serialized).not.toContain(forbidden)
})

test('endpoint denies unauthenticated, seller and foreign-organization requests', async ({ request }) => {
  expect((await request.get('/api/sales-native/social/connections')).status()).toBe(401)
  expect((await endpoint(request, people[3])).status()).toBe(403)
  expect((await endpoint(request, people[0], foreignOrg)).status()).toBe(403)
})

test('Sales administrator without company access receives no connection or grant metadata', async ({ request }) => {
  const response = await endpoint(request, people[2])
  expect(response.status()).toBe(200)
  expect((await response.json()).data).toMatchObject({ companies: [], integrations: [], assets: [], ingestionEnabled: false })
})
