import { test, expect } from '@playwright/test'
import { H, PASSWORD, ensureUser, deleteUser, getUsuario, authIdByEmail } from './seed'

const base = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const email = 'staff-patient-onboarding-qa@eminat.net'
let authId: string
let employee: unknown
// This fixture may never run against a hosted or Production Auth/database.
function localOnly() {
  if (!['http://127.0.0.1:54321', 'http://localhost:54321'].includes(base))
    throw new Error('LOCAL_PATIENT_STAFF_FIXTURE_REQUIRED')
}

test.beforeAll(async () => {
  localOnly()
  authId = await ensureUser(email, 'sin_asignar', 'Private Employee', 'Operational Data')
  employee = await getUsuario(email)
})
test.afterAll(async () => {
  localOnly()
  if (authId) {
    const result = await fetch(`${base}/rest/v1/sales_patient_sessions?auth_id=eq.${authId}`, {
      method: 'DELETE', headers: H,
    })
    expect(result.ok).toBe(true)
  }
  await deleteUser(email)
})

test('verified existing staff Auth logs into patient onboarding without employee data or duplicate Auth', async ({ request }) => {
  // Exercise GoTrue's real duplicate-signup code; no mail is sent by generate_link.
  // A confirmed staff password must survive even when registration supplies another.
  const duplicate = await request.post(`${base}/auth/v1/admin/generate_link`, {
    headers:H, data:{type:'signup',email,password:'untrusted-replacement-password'},
  })
  expect(duplicate.status()).toBe(422)
  const duplicateError = await duplicate.json()
  expect(['email_exists','user_already_exists']).toContain(duplicateError.error_code)
  // The existing valid password predates the new-account 12-character rule.
  const login = await request.post('/api/patient/v1/login', { data: { email, password: PASSWORD } })
  expect(login.status()).toBe(200)
  const data = await login.json()
  expect(data.sessionHandle).toMatch(/^cspt_/)
  expect(data).not.toHaveProperty('access_token')
  const headers = { Authorization: `Patient ${data.sessionHandle}` }
  const session = await request.get('/api/patient/v1/session', { headers })
  expect(await session.json()).toEqual({ data: { authId, email, contactId: null } })
  const profile = await request.get('/api/patient/v1/profile', { headers })
  expect(profile.status()).toBe(404)
  expect(await profile.json()).toEqual({ code: 'PROFILE_REQUIRED' })
  expect(await getUsuario(email)).toEqual(employee)
  expect(await authIdByEmail(email)).toBe(authId)
  const wrong = await request.post('/api/patient/v1/login', { data: { email, password: 'wrong-password' } })
  expect(wrong.status()).toBe(401)
  const logout = await request.post('/api/patient/v1/logout', { headers, data: {} })
  expect(logout.status()).toBe(200)
  expect((await request.get('/api/patient/v1/session', { headers })).status()).toBe(401)
})
