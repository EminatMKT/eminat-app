import { randomBytes, createHash, createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { clientEnv } from '@/shared/db/env.client'
import { noStoreFetch } from '@/shared/db/noStoreFetch'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { membershipTypes, plans, saleDurations } from '@/server/sales-native/pricing'
import { createMembershipPdf } from '@/server/sales-native/membership-pdf'
import { patientEmailConfigured, sendPatientRecovery, sendPatientVerification, sendPatientWelcome } from '@/server/sales-native/patient-email-delivery'

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
const registrationDigest = (value: string) => createHmac('sha256',
  Buffer.from(process.env.PATIENT_EMAIL_OUTBOX_KEY ?? '', 'base64')).update(value).digest('hex')
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
    const { data: real, error } = await admin.from('sales_memberships')
      .select('id,plan,membership_type,duration,status,issued_at,expires_at,code,visit_fee_cents')
      .eq('organization_id', patient.identity.organization_id)
      .eq('primary_contact_id', patient.identity.contact_id).eq('is_demo', false)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) return unavailable()
    const fallback = real ? null : await admin.from('sales_memberships')
      .select('id,plan,membership_type,duration,status,issued_at,expires_at,code,visit_fee_cents')
      .eq('organization_id', patient.identity.organization_id)
      .eq('primary_contact_id', patient.identity.contact_id).eq('is_demo', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    const data = real ?? fallback?.data
    if (fallback?.error) return unavailable()
    if (!data) return respond({ data: null })
    const { data: members, error: membersError } = await admin.from('sales_household_members')
      .select('id,relationship,member_code').eq('organization_id', patient.identity.organization_id)
      .eq('membership_id', data.id).eq('status', 'ACTIVE')
    if (membersError || !members) return unavailable()
    const primary = members.find(member => member.relationship === 'PRIMARY')
    return respond({ data: { ...data, primary_member_code: primary?.member_code ?? data.code,
      covered_members: members.length, qa_synthetic: !real } })
  }
  if (resource === 'familydraft') {
    if (!patient.identity) return respond({ data: null })
    const configured = scope()
    if (!configured || configured.organization !== patient.identity.organization_id) return unavailable()
    const admin = supabaseAdmin({ noStore: true })
    const { data: intent, error: intentError } = await admin.from('sales_patient_enrollment_intents')
      .select('id,opportunity_id').eq('organization_id', patient.identity.organization_id)
      .eq('patient_identity_id', patient.identity.id).eq('membership_type', 'FAMILY')
      .in('status', ['PAYMENT_UNAVAILABLE','PAYMENT_PENDING'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (intentError) return unavailable()
    if (!intent || !intent.opportunity_id) return respond({ data: null })
    const { data: members, error: membersError } = await admin.from('sales_patient_family_draft_members')
      .select('id,first_name,last_name,date_of_birth,relationship,status,created_at')
      .eq('organization_id', patient.identity.organization_id)
      .eq('patient_identity_id', patient.identity.id).eq('enrollment_intent_id', intent.id)
      .eq('status', 'DRAFT').order('created_at', { ascending: true })
    if (membersError) return unavailable()
    const { data: invoice, error: invoiceError } = await admin.from('sales_patient_qbo_manual')
      .select('qbo_invoice_number,verification_state')
      .eq('organization_id', patient.identity.organization_id)
      .eq('enrollment_intent_id', intent.id).maybeSingle()
    if (invoiceError) return unavailable()
    return respond({ data: { intentId: intent.id, members: members ?? [],
      capacityUsed: (members?.length ?? 0) + 1,
      locked: !!invoice && (invoice.qbo_invoice_number !== null || invoice.verification_state !== 'PENDING_INVOICE') } })
  }
  if (resource === 'household') {
    if (!patient.identity) return respond({ data: [] })
    const admin = supabaseAdmin({ noStore: true })
    const { data: real, error: membershipError } = await admin.from('sales_memberships')
      .select('id,code,issued_at,expires_at,membership_type,status').eq('organization_id', patient.identity.organization_id)
      .eq('primary_contact_id', patient.identity.contact_id).eq('is_demo', false)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (membershipError) return unavailable()
    const fallback = real ? null : await admin.from('sales_memberships')
      .select('id,code,issued_at,expires_at,membership_type,status').eq('organization_id', patient.identity.organization_id)
      .eq('primary_contact_id', patient.identity.contact_id).eq('is_demo', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (fallback?.error) return unavailable()
    const membership = real ?? fallback?.data
    if (!membership) return respond({ data: [] })
    const { data: members, error: memberError } = await admin.from('sales_household_members')
      .select('id,contact_id,relationship,status,member_index,code,member_code')
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
        status: member.status, is_primary: member.relationship === 'PRIMARY',
        member_code: member.member_code ?? (member.relationship === 'PRIMARY'
          ? `${membership.code} A` : member.code),
        effective_date: membership.issued_at, expires_at: membership.expires_at }
    }) })
  }
  if (resource === 'householdrequests') {
    if (!patient.identity) return respond({ data: [] })
    const { data, error } = await supabaseAdmin({ noStore: true }).from('sales_family_requests')
      .select('id,first_name,last_name,relationship,status,additional_fee_review,created_at')
      .eq('organization_id', patient.identity.organization_id)
      .eq('patient_identity_id', patient.identity.id)
      .order('created_at', { ascending: false }).limit(20)
    return error ? unavailable() : respond({ data: data ?? [] })
  }
  if (resource === 'membershippdf') {
    if (!patient.identity) return respond({ code: 'MEMBERSHIP_NOT_FOUND' }, 404)
    const params = new URL(request.url).searchParams
    if (Array.from(params.keys()).some(key => key !== 'download' && key !== 'memberId') ||
        (params.has('download') && params.get('download') !== '1') ||
        (params.has('memberId') && !uuidPattern.test(params.get('memberId') ?? ''))) return invalid()
    const admin = supabaseAdmin({ noStore: true })
    const { data: real, error } = await admin.from('sales_memberships')
      .select('id,code,first_name,last_name,plan,membership_type,duration,issued_at,expires_at,status')
      .eq('organization_id', patient.identity.organization_id)
      .eq('primary_contact_id', patient.identity.contact_id).eq('is_demo', false)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) return unavailable()
    const fallback = real ? null : await admin.from('sales_memberships')
      .select('id,code,first_name,last_name,plan,membership_type,duration,issued_at,expires_at,status')
      .eq('organization_id', patient.identity.organization_id)
      .eq('primary_contact_id', patient.identity.contact_id).eq('is_demo', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (fallback?.error) return unavailable()
    const data = real ?? fallback?.data
    if (!data?.code) return respond({ code: 'MEMBERSHIP_NOT_FOUND' }, 404)
    const memberId = params.get('memberId')
    const memberQuery = admin.from('sales_household_members')
      .select('id,contact_id,relationship,code,member_code')
      .eq('organization_id', patient.identity.organization_id)
      .eq('membership_id', data.id).eq('status', 'ACTIVE')
    const { data: member, error: memberError } = await (memberId
      ? memberQuery.eq('id', memberId) : memberQuery.eq('relationship', 'PRIMARY')).maybeSingle()
    if (memberError) return unavailable()
    if (memberId && !member) return respond({ code: 'MEMBER_NOT_FOUND' }, 404)
    let memberFirstName = data.first_name
    let memberLastName = data.last_name
    if (member && member.relationship !== 'PRIMARY') {
      const { data: contact, error: contactError } = await admin.from('sales_contacts')
        .select('first_name,last_name').eq('organization_id', patient.identity.organization_id)
        .eq('id', member.contact_id).maybeSingle()
      if (contactError || !contact) return unavailable()
      memberFirstName = contact.first_name
      memberLastName = contact.last_name
    }
    const code = member ? member.member_code ?? member.code ?? data.code : data.code
    const pdf = await createMembershipPdf({
      code, firstName: memberFirstName, lastName: memberLastName,
      plan: data.plan, membershipType: data.membership_type, duration: data.duration,
      issuedAt: data.issued_at, expiresAt: data.expires_at,
      qaSynthetic: !real,
      status: data.status === 'ACTIVE' && data.expires_at < new Date().toISOString().slice(0, 10)
        ? 'EXPIRED' : data.status,
    })
    const file = code.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 32) || 'membership'
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
      .select('enrollment_intent_id,verification_state,qbo_invoice_number,qbo_invoice_status,qbo_hosted_payment_url,qa_synthetic')
      .eq('organization_id', patient.identity.organization_id).in('enrollment_intent_id', ids)
    if (invoiceError) return unavailable()
    const byIntent = new Map((invoices ?? []).map(row => [row.enrollment_intent_id, row]))
    return respond({ data: (data ?? []).map(row => {
      const invoice = byIntent.get(row.id)
      const paymentUrl = invoice?.qbo_hosted_payment_url
      const reviewRequested = row.status === 'CHANGE_REQUESTED' || row.status === 'CANCELLATION_REQUESTED'
      return { ...row, payment_state: reviewRequested ? row.status : invoice?.verification_state ?? 'PENDING_INVOICE',
        qbo_invoice_number: invoice?.qbo_invoice_number ?? null,
        qbo_invoice_status: invoice?.qbo_invoice_status ?? null,
        // Only a recorded QBO-hosted URL for this authenticated patient's intent is exposed.
        qbo_hosted_payment_url: !reviewRequested && invoice?.qbo_invoice_status !== 'VOID' && !invoice?.qa_synthetic && paymentUrl &&
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
  if (resource === 'passwordrecovery') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!emailPattern.test(email) || email.length > 320) return invalid()
    if (!patientEmailConfigured()) return unavailable()
    const admin = supabaseAdmin({ noStore: true })
    const sourceAddress = process.env.VERCEL === '1'
      ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : null
    const { data: admitted, error: admissionError } = await admin.rpc('native_sales_patient_recovery_admit', {
      p_email_digest: registrationDigest(`recovery:${email}`),
      p_ip_digest: sourceAddress ? registrationDigest(sourceAddress) : null,
    })
    if (admissionError) return unavailable()
    if (!admitted) return respond({ code: 'RECOVERY_RATE_LIMITED' }, 429)
    const { data: eligible, error: eligibilityError } = await admin
      .rpc('native_sales_patient_can_reset_password', { p_email: email })
    if (eligibilityError) return unavailable()
    // Identical response for unknown, staff, and confirmed patient addresses.
    if (!eligible) return respond({ status: 'CHECK_EMAIL' }, 202)
    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email })
    const token = data?.properties?.hashed_token
    if (!error && token && /^[A-Za-z0-9_-]{12,512}$/.test(token)) {
      // A fragment never reaches the Portal web server or ordinary URL logs.
      const actionUrl = new URL('https://portal.corazonsalud.health/recuperar')
      actionUrl.hash = new URLSearchParams({ token_hash: token }).toString()
      await sendPatientRecovery(randomBytes(16).toString('hex'), email, actionUrl.toString())
    }
    return respond({ status: 'CHECK_EMAIL' }, 202)
  }
  if (resource === 'passwordreset') {
    const token = typeof body.tokenHash === 'string' ? body.tokenHash : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!/^[A-Za-z0-9_-]{12,512}$/.test(token) ||
        password.length < 12 || password.length > 128) return invalid()
    const auth = authClient()
    const { data, error } = await auth.auth.verifyOtp({ token_hash: token, type: 'recovery' })
    if (error || !data.user?.email || !data.session) return respond({ code: 'RECOVERY_LINK_INVALID' }, 401)
    const admin = supabaseAdmin({ noStore: true })
    const { data: eligible, error: eligibilityError } = await admin.rpc(
      'native_sales_patient_can_reset_password', { p_email: data.user.email })
    if (eligibilityError || !eligible) return respond({ code: 'RECOVERY_LINK_INVALID' }, 401)
    // GoTrue can issue a session again for an already-used recovery hash. Claim
    // the token atomically before any password or session mutation.
    const { data: claimed, error: claimError } = await admin.rpc(
      'native_sales_patient_claim_recovery_token', {
        p_token_digest: hash(token), p_auth_id: data.user.id,
      })
    if (claimError || !claimed) {
      await auth.auth.signOut()
      return claimError ? unavailable() : respond({ code: 'RECOVERY_LINK_INVALID' }, 401)
    }
    const { error: revokeError } = await admin.from('sales_patient_sessions')
      .update({ revoked_at: new Date().toISOString() }).eq('auth_id', data.user.id)
      .is('revoked_at', null)
    if (revokeError) return unavailable()
    const { error: updateError } = await auth.auth.updateUser({ password })
    await auth.auth.signOut()
    return updateError ? unavailable() : respond({ status: 'PASSWORD_UPDATED' })
  }
  if (resource === 'register' || resource === 'login') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!emailPattern.test(email) || email.length > 320 || password.length < 12 || password.length > 128)
      return invalid()
    if (resource === 'register') {
      if (!scope() || !patientEmailConfigured()) return unavailable()
      const sourceAddress = process.env.VERCEL === '1'
        ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : null
      const { data: admitted, error: admissionError } = await supabaseAdmin({ noStore: true })
        .rpc('native_sales_patient_registration_admit', {
          p_email_digest: registrationDigest(email),
          p_ip_digest: sourceAddress ? registrationDigest(sourceAddress) : null,
        })
      if (admissionError) return unavailable()
      if (!admitted) return respond({ code: 'REGISTRATION_RATE_LIMITED' }, 429)
      // Supabase Auth is shared with LILLY staff. Generate only the Patient Portal's
      // verification link here so the global Auth sender and templates stay unchanged.
      const { data, error } = await supabaseAdmin({ noStore: true }).auth.admin.generateLink({
        type: 'signup', email, password, options: {
          redirectTo: 'https://portal.corazonsalud.health/login',
          data: { corazon_patient_signup: true },
        },
      })
      // Do not disclose whether a confirmed account already owns the address.
      // A repeated request must not create another Auth identity or CRM contact.
      if (error?.code === 'user_already_exists') {
        const admin = supabaseAdmin({ noStore: true })
        const { data: canRecover, error: recoveryError } = await admin
          .rpc('native_sales_patient_registration_can_recover', { p_email: email })
        if (!recoveryError && canRecover) {
          const { data: recovery, error: linkError } = await admin.auth.admin.generateLink({
            type: 'magiclink', email,
            options: { redirectTo: 'https://portal.corazonsalud.health/login' },
          })
          if (!linkError && recovery?.properties?.action_link)
            await sendPatientVerification(randomBytes(16).toString('hex'), email,
              recovery.properties.action_link)
        }
        return respond({ status: 'CHECK_EMAIL' }, 202)
      }
      if (error || !data.properties?.action_link) return respond({ code: 'REGISTRATION_UNAVAILABLE' }, 503)
      const sent = await sendPatientVerification(randomBytes(16).toString('hex'), email, data.properties.action_link)
      return ['SENT', 'QUEUED', 'RETRY', 'UNKNOWN'].includes(sent.status)
        ? respond({ status: 'CHECK_EMAIL' }, 202)
        : respond({ code: 'REGISTRATION_UNAVAILABLE' }, 503)
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
    if (sessionError) return unavailable()
    await sendPatientWelcome(data.user.id, email)
    return respond({ sessionHandle: handle, expiresAt })
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
    if (error) return unavailable()
    return respond({ contactId: data }, 201)
  }
  if (resource === 'enrollment') {
    if (!patient.identity) return respond({ code: 'PROFILE_REQUIRED' }, 409)
    const plan = body.plan, type = body.type, duration = body.duration
    const key = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : ''
    if (!(plans as readonly unknown[]).includes(plan) ||
        !(membershipTypes as readonly unknown[]).includes(type) ||
        !(saleDurations as readonly unknown[]).includes(duration) || !uuidPattern.test(key)) return invalid()
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_patient_enroll', {
      p_identity_id: patient.identity.id, p_plan: plan, p_type: type,
      p_duration: duration, p_request_key: key,
    })
    if (error?.message.includes('PATIENT_SELECTION_ALREADY_EXISTS') ||
      error?.message.includes('PATIENT_IDEMPOTENCY_CONFLICT') ||
      error?.message.includes('PATIENT_MEMBERSHIP_ACTIVE'))
      return respond({ code: 'SELECTION_ALREADY_EXISTS' }, 409)
    return error ? unavailable() : respond({ data, paymentExecution: 'PENDING' }, 201)
  }
  if (resource === 'selection') {
    if (!patient.identity) return respond({ code: 'PROFILE_REQUIRED' }, 409)
    const action = body.action
    const key = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : ''
    if (!['CHANGE','CANCEL'].includes(String(action)) || !uuidPattern.test(key)) return invalid()
    const plan = action === 'CHANGE' ? body.plan : null
    const type = action === 'CHANGE' ? body.type : null
    const duration = action === 'CHANGE' ? body.duration : null
    if (action === 'CHANGE' && (!(plans as readonly unknown[]).includes(plan) ||
      !(membershipTypes as readonly unknown[]).includes(type) ||
      !(saleDurations as readonly unknown[]).includes(duration))) return invalid()
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_patient_selection_action', {
      p_identity_id: patient.identity.id, p_action: action, p_plan: plan,
      p_type: type, p_duration: duration, p_request_key: key,
    })
    if (error?.message.includes('PATIENT_SELECTION_REVIEW_PENDING') ||
        error?.message.includes('PATIENT_PAYMENT_LOCKED'))
      return respond({ code: 'SELECTION_REVIEW_REQUIRED' }, 409)
    return error ? unavailable() : respond({ data })
  }
  if (resource === 'invoice') {
    if (!patient.identity) return respond({ code:'PROFILE_REQUIRED' },409)
    const intentId = typeof body.intentId === 'string' ? body.intentId : ''
    if (!uuidPattern.test(intentId) || Object.keys(body).some(key => key !== 'intentId'))
      return invalid()
    try {
      const { issuePatientQboInvoice } = await import('@/server/sales-native/quickbooks/automatic-invoice')
      const result = await issuePatientQboInvoice(patient.identity.id,intentId,patient.email)
      return respond(result,result.status === 'PENDING_RECONCILIATION' ? 202 : 200)
    } catch {
      // Do not expose provider details or automatically repeat an uncertain write.
      return respond({ code:'INVOICE_REVIEW_REQUIRED' },503)
    }
  }
  if (resource === 'familydraft') {
    if (!patient.identity) return respond({ code: 'PROFILE_REQUIRED' }, 409)
    const configured = scope()
    if (!configured || configured.organization !== patient.identity.organization_id) return unavailable()
    const action = body.action
    const memberId = body.memberId
    const key = body.idempotencyKey
    if (!['ADD','EDIT','REMOVE'].includes(String(action)) || typeof key !== 'string' || !uuidPattern.test(key)
      || (action === 'ADD' ? memberId !== undefined : typeof memberId !== 'string' || !uuidPattern.test(memberId))) return invalid()
    const removing = action === 'REMOVE'
    const allowed = removing ? ['action','memberId','idempotencyKey'] :
      [...(action === 'EDIT' ? ['memberId'] : []),'action','idempotencyKey',
        'firstName','lastName','dateOfBirth','relationship']
    if (Object.keys(body).some(field => !allowed.includes(field))) return invalid()
    const firstName = removing ? null : typeof body.firstName === 'string' ? body.firstName.trim() : null
    const lastName = removing ? null : typeof body.lastName === 'string' ? body.lastName.trim() : null
    const relationship = removing ? null : body.relationship
    const dob = removing ? null : body.dateOfBirth
    const parsedDate = typeof dob === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dob)
      ? new Date(`${dob}T00:00:00Z`) : null
    if (!removing && (!firstName || firstName.length > 80 || !lastName || lastName.length > 80
      || !['SPOUSE','CHILD','PARENT','OTHER'].includes(String(relationship))
      || !parsedDate || Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0,10) !== dob
      || dob > new Date().toISOString().slice(0,10) || dob < '1900-01-01')) return invalid()
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_patient_family_draft_action', {
      p_identity_id: patient.identity.id, p_action: action,
      p_member_id: action === 'ADD' ? null : memberId,
      p_first_name: firstName, p_last_name: lastName,
      p_date_of_birth: dob, p_relationship: relationship,
      p_request_key: key,
    })
    if (error?.message.includes('HOUSEHOLD_LIMIT_REACHED') ||
      error?.message.includes('PATIENT_FAMILY_DRAFT_INVOICE_LOCKED') ||
      error?.message.includes('PATIENT_FAMILY_DRAFT_NOT_ELIGIBLE'))
      return respond({ code: 'FAMILY_DRAFT_CONFLICT' }, 409)
    return error ? unavailable() : respond({ data }, action === 'ADD' ? 201 : 200)
  }
  if (resource === 'householdrequest') {
    if (!patient.identity) return respond({ code: 'PROFILE_REQUIRED' }, 409)
    const configured = scope()
    if (!configured || configured.organization !== patient.identity.organization_id) return unavailable()
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
    const relationship = typeof body.relationship === 'string' ? body.relationship : ''
    const dob = typeof body.dateOfBirth === 'string' ? body.dateOfBirth : ''
    const key = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : ''
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? new Date(`${dob}T00:00:00Z`) : null
    if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80 ||
        !['SPOUSE','CHILD','PARENT','OTHER'].includes(relationship) ||
        !parsedDate || Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0,10) !== dob ||
        dob > new Date().toISOString().slice(0,10) || dob < '1900-01-01' ||
        body.authorityAttested !== true || !uuidPattern.test(key)) return invalid()
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_patient_family_request', {
      p_identity_id: patient.identity.id, p_owner_member_id: configured.owner,
      p_first_name: firstName, p_last_name: lastName, p_date_of_birth: dob,
      p_relationship: relationship, p_key: key,
    })
    return error ? unavailable() : respond({ data }, 201)
  }
  if (resource === 'householdremove') {
    if (!patient.identity) return respond({ code: 'PROFILE_REQUIRED' }, 409)
    const configured = scope()
    if (!configured || configured.organization !== patient.identity.organization_id) return unavailable()
    const memberId = typeof body.memberId === 'string' ? body.memberId : ''
    const key = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : ''
    if (!uuidPattern.test(memberId) || !uuidPattern.test(key) || Object.keys(body).length !== 2)
      return invalid()
    const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_sales_patient_remove_family_member', {
      p_identity_id: patient.identity.id, p_household_member_id: memberId,
      p_owner_member_id: configured.owner, p_request_id: key,
    })
    if (error?.message.includes('PATIENT_FAMILY_MEMBER_NOT_FOUND') ||
        error?.message.includes('PATIENT_FAMILY_NOT_ELIGIBLE'))
      return respond({ code: 'FAMILY_MEMBER_NOT_ELIGIBLE' }, 409)
    return error ? unavailable() : respond({ data })
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
