import 'server-only'
import { createHash } from 'node:crypto'
import { Resend } from 'resend'
import { renderPatientEmail, type PatientEmail } from './patient-email-template'

type Kind = 'verification' | 'welcome' | 'invoice' | 'activation'
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
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address) && Boolean(env.RESEND_API_KEY)
}

export async function sendPatientEmail(args: {
  kind: Kind; eventId: string; recipient: string; content: PatientEmail
}, options: { provider?: Provider; env?: Record<string, string | undefined> } = {}) {
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
    return { status: 'FAILED' as const }
  }
}

export async function sendPatientWelcome(authId: string, recipient: string) {
  return sendPatientEmail({ kind: 'welcome', eventId: authId, recipient, content: {
    title: '¡Bienvenido a Corazón Salud!',
    message: 'Tu cuenta de Corazón Salud está lista. Completa tu perfil y elige la membresía que mejor se adapte a ti.',
    actionLabel: 'Ir a mi Portal', actionUrl: 'https://portal.corazonsalud.health/dashboard',
  } })
}

export async function sendPatientVerification(eventId: string, recipient: string, actionUrl: string) {
  return sendPatientEmail({ kind: 'verification', eventId, recipient, content: {
    title: 'Confirma tu cuenta de Corazón Salud',
    message: 'Confirma tu correo para entrar al Portal de Corazón Salud. Tu membresía todavía no está activa.',
    actionLabel: 'Confirmar mi cuenta', actionUrl,
  } })
}

export async function sendPatientInvoice(intentId: string, recipient: string, invoiceNumber: string) {
  const eventId = createHash('sha256').update(`${intentId}\0${invoiceNumber}`).digest('hex')
  return sendPatientEmail({ kind: 'invoice', eventId, recipient, content: {
    title: 'Tu factura está disponible',
    message: 'Tu selección de Corazón Salud sigue pendiente de pago. Puedes consultar la factura y abrir el pago seguro desde tu Portal.',
    actionLabel: 'Ver mi pago', actionUrl: 'https://portal.corazonsalud.health/pagos',
    details: [{ label: 'Factura', value: invoiceNumber }],
  } })
}

export async function sendPatientActivation(membershipId: string, recipient: string, firstName: string) {
  return sendPatientEmail({ kind: 'activation', eventId: membershipId, recipient, content: {
    title: `Tu membresía está activa, ${firstName}`,
    message: 'Ya puedes consultar los detalles de tu membresía Corazón Salud en el Portal.',
    actionLabel: 'Ver mi membresía', actionUrl: 'https://portal.corazonsalud.health/membresia',
  } })
}
