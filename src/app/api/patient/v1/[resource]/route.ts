import { randomBytes, createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { clientEnv } from '@/shared/db/env.client'
import { noStoreFetch } from '@/shared/db/noStoreFetch'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { membershipTypes, plans, saleDurations } from '@/server/sales-native/pricing'
import { createMembershipPdf } from '@/server/sales-native/membership-pdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const handlePattern = /^cspt_[A-Za-z0-9_-]{40,100}$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const addressKeys = ['street','line2','city','state','postalCode','country'] as const
type PatientAddress = Record<(typeof addressKeys)[number], string>
const addressLimits: Record<keyof PatientAddress, number> = {
  street: 500, line2: 200, city: 200, state: 200, postalCode: 40, country: 200,
}
function validatedAddress(value: unknown): PatientAddress | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const fields = value as Record<string, unknown>
  if (Object.keys(fields).some(key => !addressKeys.includes(key as keyof PatientAddress))) return null
  const address = {} as PatientAddress
  for (const key of addressKeys) {
    if (typeof fields[key] !== 'string') return null
    const part = fields[key].trim()
    if (part.length > addressLimits[key] || /[\u0000-\u001f\u007f]/.test(part)) return null
    address[key] = part
  }
  return address.street && address.city && address.country ? address : null
}
const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const invalid = () => respond({ code: 'INVALID_REQUEST' }, 422)
const unavailable = () => respond({ code: 'PATIENT_API_UNAVAILABLE' }, 503)
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const authClient = () => createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: noStoreFetch },
})
type Route = { params: Promise<{ resource: string }> }
type Authenticated = { authId: string; email: string; identity: { id: string; contact_id: string; organization_id: string } | null }

function scope() {
  const organization = process.env.PATIENT_SALES_ORGANIZATION_ID ?? ''
  const owner = process.env.PATIENT_SALES_OWNER_MEMBER_ID ?? ''
  if (!uuidPattern.test(organization) || !uuidPattern.test(owner)) return null
  return { organization, owner }
}

async function authenticate(request: Request): Promise<Authenticated | null> {
  const authorization = request.headers.get('authorization') ?? ''
  const handle = authorization.startsWith('Patient ') ? authorization.slice(8) : ''
  if (!handlePattern.test(handle)) return null
  const admin = supabaseAdmin({ noStore: true })
  const { data: session, error } = await admin.from('sales_patient_sessions')
    .select('auth_id,expires_at,revoked_at').eq('handle_hash', hash(handle)).maybeSingle()
  if (error || !session || session.revoked_at || Date.parse(session.expires_at) <= Date.now()) return null
  const { data: user, error: userError } = await admin.auth.admin.getUserById(session.auth_id)
  if (userError || !user.user?.email || !user.user.email_confirmed_at ||
      (user.user.banned_until && Date.parse(user.user.banned_until) > Date.now())) return null
  const { data: identity, error: bindingError } = await admin.from('sales_patient_identities')
    .select('id,contact_id,organization_id').eq('auth_id', session.auth_id).maybeSingle()
  if (bindingError) return null
  return { authId: session.auth_id, email: user.user.email, identity }
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    if (Number(request.headers.get('content-length') ?? '0') > 8192) return null
    const value: unknown = await request.json()
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  } catch { return null }
}

export async function GET(request: Request, { params }: Route) {
  const { resource } = await params
  if (resource === 'plans') {
    const admin = supabaseAdmin({ noStore: true })
    try {
      const quotes = await Promise.all(plans.flatMap(plan => membershipTypes.flatMap(type => saleDurations.map(async duration => {
        const { data, error } = await admin.rpc('native_sales_membership_quote', {
          p_plan: plan, p_type: type, p_duration: duration,
        })
        if (error || !data?.[0]) throw new Error('quote unavailable')
        return { plan, type, duration, ...data[0] }
      }))))
      return respond({ data: quotes })
    } catch { return unavailable() }
  }
  const patient = await authenticate(request)
  if (!patient) return respond({ code: 'AUTHENTICATION_REQUIRED' }, 401)
  if (resource === 'session') return respond({ data: {
    authId: patient.authId, email: patient.email, contactId: patient.identity?.contact_id ?? null,
  } })
  if (resource === 'profile') {
    if (!patient.identity) return respond({ code: 'PROFILE_REQUIRED' }, 404)
    const { data, error } = await supabaseAdmin({ noStore: true }).from('sales_contacts')
      .select('id,first_name,last_name,email,phone,address,created_at')
      .eq('organization_id', patient.identity.organization_id).eq('id', patient.identity.contact_id).maybeSingle()
    return error || !data ? unavailable() : respond({ data })
  }
  if (resource === 'membership') {
    if (!patient.identity) return respond({ data: null })
    const admin = supabaseAdmin({ noStore: true })
    const { data, error } = await admin.from('sales_memberships')
      .select('id,plan,membership_type,duration,status,issued_at,expires_at,code')
      .eq('organization_id', patient.identity.organization_id)
      .eq('primary_contact_id', patient.identity.contact_id).eq('is_demo', false)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error || !data) return error ? unavailable() : respond({ data: null })
    const { data: members, error: membersError } = await admin.from('sales_household_members')
      .select('id').eq('organization_id', patient.identity.organization_id)
      .eq('membership_id', data.id).eq('status', 'ACTIVE')
    if (membersError || !members) return unavailable()
    return respond({ data: { ...data, covered_members: members.length } })
  }
  if (resource === 'household') {
    if (!patient.identity) return respond({ data: [] })
    const admin = supabaseAdmin({ noStore: true })
    const { data: membership, error: membershipError } = await admin.from('sales_memberships')
      .select('id').eq('organization_id', patient.identity.organization_id)
      .eq('primary_contact_id', patient.identity.contact_id).eq('is_demo', false)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (membershipError) return unavailable()
    if (!membership) return respond({ data: [] })
    const { data: members, error: memberError } = await admin.from('sales_household_members')
      .select('id,contact_id,relationship,status,member_index')
      .eq('organization_id', patient.identity.organization_id).eq('membership_id', membership.id)
      .order('member_index', { ascending: true })
    if (memberError || !members) return unavailable()
    if (!members.length) return respond({ data: [] })
    const { data: contacts, error: contactError } = await admin.from('sales_contacts')
      .select('id,first_name,last_name').eq('organization_id', patient.identity.organization_id)
      .in('id', members.map(member => member.contact_id))
    if (contactError || !contacts) return unavailable()
    const byId = new Map(contacts.map(contact => [contact.id, contact]))
    if (members.some(member => !byId.has(member.contact_id))) return unavailable()
    return respond({ data: members.map(member => {
      const contact = byId.get(member.contact_id)
      return { id: member.id, first_name: contact?.first_name,
        last_name: contact?.last_name, relationship: member.relationship,
        status: member.status, is_primary: member.relationship === 'PRIMARY' }
    }) })
  }
  if (resource === 'membershippdf') {
    if (!patient.identity) return respond({ code: 'MEMBERSHIP_NOT_FOUND' }, 404)
    const params = new URL(request.url).searchParams
    if (Array.from(params.keys()).some(key => key !== 'download') ||
        (params.has('download') && params.get('download') !== '1')) return invalid()
    const { data, error } = await supabaseAdmin({ noStore: true }).from('sales_memberships')
      .select('code,first_name,last_name,plan,membership_type,duration,issued_at,expires_at,status')
      .eq('organization_id', patient.identity.organization_id)
      .eq('primary_contact_id', patient.identity.contact_id).eq('is_demo', false)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) return unavailable()
    if (!data?.code) return respond({ code: 'MEMBERSHIP_NOT_FOUND' }, 404)
    const pdf = await createMembershipPdf({
      code: data.code, firstName: data.first_name, lastName: data.last_name,
      plan: data.plan, membershipType: data.membership_type, duration: data.duration,
      issuedAt: data.issued_at, expiresAt: data.expires_at,
      status: data.status === 'ACTIVE' && data.expires_at < new Date().toISOString().slice(0, 10)
        ? 'EXPIRED' : data.status,
    })
    const file = data.code.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 32) || 'membership'
    return new Response(pdf as BodyInit, { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${params.get('download') === '1' ? 'attachment' : 'inline'}; filename="corazon-salud-${file}.pdf"`,
      'Cache-Control': 'private, no-store', 'Vary': 'Authorization',
      'X-Content-Type-Options': 'nosniff',
    } })
  }
  if (resource === 'enrollment') {
    if (!patient.identity) return respond({ data: [] })
    const admin = supabaseAdmin({ noStore: true })
    const { data, error } = await admin.from('sales_patient_enrollment_intents')
      .select('id,plan,membership_type,duration,initial_months,amount_cents,status,created_at')
      .eq('organization_id', patient.identity.organization_id).eq('patient_identity_id', patient.identity.id)
      .order('created_at', { ascending: false }).limit(10)
    if (error) return unavailable()
    const ids = (data ?? []).map(row => row.id)
    if (!ids.length) return respond({ data: [] })
    const { data: invoices, error: invoiceError } = await admin.from('sales_patient_qbo_manual')
      .select('enrollment_intent_id,verification_state,qbo_invoice_number,qbo_hosted_payment_url,qa_synthetic')
      .eq('organization_id', patient.identity.organization_id).in('enrollment_intent_id', ids)
    if (invoiceError) return unavailable()
    const byIntent = new Map((invoices ?? []).map(row => [row.enrollment_intent_id, row]))
    return respond({ data: (data ?? []).map(row => {
      const invoice = byIntent.get(row.id)
      const paymentUrl = invoice?.qbo_hosted_payment_url
      return { ...row, payment_state: invoice?.verification_state ?? 'PENDING_INVOICE',
        qbo_invoice_number: invoice?.qbo_invoice_number ?? null,
        // Only a recorded QBO-hosted URL for this authenticated patient's intent is exposed.
        qbo_hosted_payment_url: !invoice?.qa_synthetic && paymentUrl &&
          /^https:\/\/connect\.intuit\.com\/t\/[^\s]+$/.test(paymentUrl)
          ? paymentUrl : null }
    }) })
  }
  return respond({ code: 'NOT_FOUND' }, 404)
}

export async function POST(request: Request, { params }: Route) {
  const { resource } = await params
  const body = await readBody(request)
  if (!body) return invalid()
  if (resource === 'register' || resource === 'login') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!emailPattern.test(email) || email.length > 320 || password.length < 12 || password.length > 128)
      return invalid()
    if (resource === 'register') {
      if (!scope()) return unavailable()
      const { error } = await authClient().auth.signUp({ email, password, options: {
        emailRedirectTo: 'https://portal.corazonsalud.health/login',
      } })
      return error ? respond({ code: 'REGISTRATION_UNAVAILABLE' }, 503) : respond({ status: 'CHECK_EMAIL' }, 202)
    }
    const { data, error } = await authClient().auth.signInWithPassword({ email, password })
    if (error || !data.user || !data.user.email_confirmed_at) return respond({ code: 'INVALID_CREDENTIALS' }, 401)
    const admin = supabaseAdmin({ noStore: true })
    const { data: staff, error: staffError } = await admin.from('usuarios')
      .select('id').eq('auth_id', data.user.id).maybeSingle()
    if (staffError) return unavailable()
    if (staff) return respond({ code: 'PATIENT_ACCESS_DENIED' }, 403)
    const handle = `cspt_${randomBytes(36).toString('base64url')}`
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    const { error: sessionError } = await admin.from('sales_patient_sessions')
      .insert({ handle_hash: hash(handle), auth_id: data.user.id, expires_at: expiresAt })
    return sessionError ? unavailable() : respond({ sessionHandle: handle, expiresAt })
  }
  const patient = await authenticate(request)
  if (!patient) return respond({ code: 'AUTHENTICATION_REQUIRED' }, 401)
  if (resource === 'logout') {
    const handle = (request.headers.get('authorization') ?? '').slice(8)
    const { error } = await supabaseAdmin({ noStore: true }).from('sales_patient_sessions')
      .update({ revoked_at: new Date().toISOString() }).eq('handle_hash', hash(handle))
    return error ? unavailable() : respond({ ok: true })
  }
  if (resource === 'profile') {
    if (patient.identity) return respond({ code: 'PROFILE_ALREADY_BOUND' }, 409)
    const configured = scope()
    if (!configured) return unavailable()
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : null
    if (!firstName || firstName.length > 160 || !lastName || lastName.length > 160 ||
        (phone !== null && phone.length > 40)) return invalid()
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_patient_claim_contact', {
      p_auth_id: patient.authId, p_email: patient.email, p_first_name: firstName,
      p_last_name: lastName, p_phone: phone, p_organization_id: configured.organization,
      p_owner_member_id: configured.owner,
    })
    if (error?.message.includes('PATIENT_CONTACT_REVIEW_REQUIRED'))
      return respond({ code: 'OWNER_REVIEW_REQUIRED' }, 409)
    return error ? unavailable() : respond({ contactId: data }, 201)
  }
  if (resource === 'enrollment') {
    if (!patient.identity) return respond({ code: 'PROFILE_REQUIRED' }, 409)
    const plan = body.plan, type = body.type, duration = body.duration
    const key = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : ''
    if (!(plans as readonly unknown[]).includes(plan) ||
        !(membershipTypes as readonly unknown[]).includes(type) ||
        !(saleDurations as readonly unknown[]).includes(duration) || !uuidPattern.test(key)) return invalid()
    const admin = supabaseAdmin({ noStore: true })
    const { data: existingMembership, error: membershipError } = await admin.from('sales_memberships')
      .select('id').eq('organization_id', patient.identity.organization_id)
      .eq('primary_contact_id', patient.identity.contact_id).eq('status', 'ACTIVE').limit(1)
    if (membershipError) return unavailable()
    if (existingMembership?.length) return respond({ code: 'MEMBERSHIP_ALREADY_ACTIVE' }, 409)
    const { data: quote, error: quoteError } = await admin.rpc('native_sales_membership_quote', {
      p_plan: plan, p_type: type, p_duration: duration,
    })
    if (quoteError || !quote?.[0]) return unavailable()
    const { data: repeated, error: repeatedError } = await admin.from('sales_patient_enrollment_intents')
      .select('id,plan,membership_type,duration,status,amount_cents,initial_months')
      .eq('patient_identity_id', patient.identity.id).eq('idempotency_key', key).maybeSingle()
    if (repeatedError) return unavailable()
    if (repeated) return repeated.plan === plan && repeated.membership_type === type && repeated.duration === duration
      ? respond({ data: repeated, paymentExecution: 'PENDING' })
      : respond({ code: 'IDEMPOTENCY_CONFLICT' }, 409)
    const { data, error } = await admin.from('sales_patient_enrollment_intents').insert({
      organization_id: patient.identity.organization_id,
      patient_identity_id: patient.identity.id,
      plan, membership_type: type, duration, initial_months: quote[0].initial_months,
      amount_cents: quote[0].total_cents, idempotency_key: key,
      status: 'PAYMENT_UNAVAILABLE',
    })
      .select('id,status,amount_cents,initial_months').single()
    return error ? unavailable() : respond({ data, paymentExecution: 'PENDING' }, 201)
  }
  return respond({ code: 'NOT_FOUND' }, 404)
}

export async function PATCH(request: Request, { params }: Route) {
  const { resource } = await params
  if (resource !== 'profile') return respond({ code: 'NOT_FOUND' }, 404)
  const body = await readBody(request)
  if (!body || Object.keys(body).length !== 1) return invalid()
  const updatingPhone = Object.hasOwn(body, 'phone')
  const address = Object.hasOwn(body, 'address') ? validatedAddress(body.address) : null
  if (updatingPhone ? typeof body.phone !== 'string' || body.phone.trim().length > 40 : !address)
    return invalid()
  const patient = await authenticate(request)
  if (!patient) return respond({ code: 'AUTHENTICATION_REQUIRED' }, 401)
  if (!patient.identity) return respond({ code: 'PROFILE_REQUIRED' }, 409)
  const configured = scope()
  if (!configured || configured.organization !== patient.identity.organization_id) return unavailable()
  const admin = supabaseAdmin({ noStore: true })
  const { data: current, error: readError } = await admin.from('sales_contacts')
    .select('version,source').eq('organization_id', patient.identity.organization_id)
    .eq('id', patient.identity.contact_id).maybeSingle()
  if (readError || !current) return unavailable()
  if (updatingPhone && current.source !== 'PATIENT_PORTAL') return respond({ code: 'OWNER_REVIEW_REQUIRED' }, 409)
  const { data, error } = await admin.from('sales_contacts').update({
    ...(updatingPhone ? { phone: (body.phone as string).trim() || null } : { address }),
    version: current.version + 1,
    updated_by: configured.owner,
    updated_at: new Date().toISOString(),
  }).eq('organization_id', patient.identity.organization_id)
    .eq('id', patient.identity.contact_id).eq('version', current.version)
    .select('id,first_name,last_name,email,phone,address,created_at').maybeSingle()
  if (error) return unavailable()
  if (!data) return respond({ code: 'PROFILE_CONFLICT' }, 409)
  return respond({ data })
}
