import 'server-only'
import { createHash } from 'node:crypto'
import { Resend } from 'resend'
import { renderPatientEmail, type PatientEmail } from './patient-email-template'
import type { MembershipType, Plan, SaleDuration } from './pricing'

type Kind = 'verification' | 'welcome' | 'invoice' | 'activation'
export type PatientEmailRequest = {
  kind: Kind; eventId: string; recipient: string; content: PatientEmail
}
type Provider = { emails: { send: (message: {
  from: string; to: string; subject: string; html: string; text: string
}, options: { idempotencyKey: string }) => Promise<{
  data: { id: string } | null; error: { message: string } | null
}> } }

const subjects: Record<Kind, string> = {
  verification: 'Confirma tu cuenta de Corazón Salud',
  welcome: '¡Bienvenido a Corazón Salud!',
  invoice: 'Tu pago de Corazón Salud está disponible',
  activation: 'Tu membresía Corazón Salud ya está activa',
}

export function patientEmailConfigured(env: Record<string, string | undefined> = process.env) {
  const address = env.PATIENT_EMAIL_FROM_ADDRESS?.trim() ?? ''
  const outboxKey = env.PATIENT_EMAIL_OUTBOX_KEY ?? ''
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address) && Boolean(env.RESEND_API_KEY) &&
    /^[A-Za-z0-9+/]{43}=$/.test(outboxKey) && Buffer.from(outboxKey, 'base64').length === 32
}

export async function sendPatientEmail(args: PatientEmailRequest,
  options: { provider?: Provider; env?: Record<string, string | undefined> } = {}) {
  const env = options.env ?? process.env
  const address = env.PATIENT_EMAIL_FROM_ADDRESS?.trim() ?? ''
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address) ||
      !env.RESEND_API_KEY && !options.provider ||
      !/^[a-zA-Z0-9-]{8,128}$/.test(args.eventId) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.recipient))
    return { status: 'NOT_CONFIGURED' as const }
  const { html, text } = renderPatientEmail(args.content)
  const provider = options.provider ?? new Resend(env.RESEND_API_KEY!)
  try {
    const result = await provider.emails.send({
      from: `Corazón Salud <${address}>`, to: args.recipient,
      subject: subjects[args.kind], html, text,
    }, { idempotencyKey: `patient-${args.kind}-${args.eventId}` })
    return result.error || !result.data?.id
      ? { status: 'FAILED' as const }
      : { status: 'SENT' as const, providerId: result.data.id }
  } catch {
    // A network exception can occur after the provider accepted a message.
    // Do not automatically resend an ambiguous outcome.
    return { status: 'UNKNOWN' as const }
  }
}

export async function sendPatientWelcome(authId: string, recipient: string) {
  const { queuePatientEmail } = await import('./patient-email-outbox')
  return queuePatientEmail({ kind: 'welcome', eventId: authId, recipient, content: {
    title: '¡Bienvenido a Corazón Salud!',
    message: 'Tu cuenta de Corazón Salud está lista. Completa tu perfil y elige la membresía que mejor se adapte a ti.',
    actionLabel: 'Ir a mi Portal', actionUrl: 'https://portal.corazonsalud.health/dashboard',
  } })
}

export async function sendPatientVerification(eventId: string, recipient: string, actionUrl: string) {
  const { queuePatientEmail } = await import('./patient-email-outbox')
  return queuePatientEmail({ kind: 'verification', eventId, recipient, content: {
    title: 'Confirma tu cuenta de Corazón Salud',
    message: 'Confirma tu correo para entrar al Portal de Corazón Salud. Tu membresía todavía no está activa.',
    actionLabel: 'Confirmar mi cuenta', actionUrl,
  } })
}

type InvoiceEmailDetails = {
  plan: Plan
  membershipType: MembershipType
  duration: SaleDuration
  amountCents: number
  hostedUrl: string
}

export async function sendPatientInvoice(intentId: string, recipient: string, invoiceNumber: string,
  details: InvoiceEmailDetails) {
  const eventId = createHash('sha256').update(`${intentId}\0${invoiceNumber}`).digest('hex')
  const plan = { ESSENTIAL: 'Essential', PLUS: 'Plus', MAX: 'Max' }[details.plan]
  const membershipType = details.membershipType === 'FAMILY' ? 'Familiar' : 'Individual'
  const duration = { MONTHLY: 'Mes a mes', '3M': '3 meses', '6M': '6 meses', '12M': '12 meses' }[details.duration]
  const { queuePatientEmail } = await import('./patient-email-outbox')
  return queuePatientEmail({ kind: 'invoice', eventId, recipient, content: {
    title: 'Tu factura está disponible',
    message: 'Tu selección de Corazón Salud sigue pendiente de pago. Puedes abrir la factura segura de QuickBooks para completar el pago.',
    actionLabel: 'Pagar con QuickBooks', actionUrl: details.hostedUrl,
    details: [{ label: 'Factura', value: invoiceNumber },
      { label: 'Plan', value: plan }, { label: 'Tipo', value: membershipType },
      { label: 'Modalidad', value: duration },
      { label: 'Importe inicial', value: `$${(details.amountCents / 100).toFixed(2)}` }],
  } })
}

export async function sendPatientActivation(membershipId: string, recipient: string, firstName: string) {
  const { queuePatientEmail } = await import('./patient-email-outbox')
  return queuePatientEmail({ kind: 'activation', eventId: membershipId, recipient, content: {
    title: `Tu membresía está activa, ${firstName}`,
    message: 'Ya puedes consultar los detalles de tu membresía Corazón Salud en el Portal.',
    actionLabel: 'Ver mi membresía', actionUrl: 'https://portal.corazonsalud.health/membresia',
  } })
}
