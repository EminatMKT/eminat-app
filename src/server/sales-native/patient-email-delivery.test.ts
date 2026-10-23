import { describe, expect, it, vi } from 'vitest'
import { sendPatientEmail } from './patient-email-delivery'

const env = { PATIENT_EMAIL_FROM_ADDRESS: 'notifications@stratixsolutions.us' }

describe('Patient Portal transactional email', () => {
  it('uses the patient brand for an Auth verification link without leaking it in logs', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'message-2' }, error: null })
    const result = await sendPatientEmail({ kind: 'verification', eventId: 'verification-12345678',
      recipient: 'patient@example.test', content: { title: 'Confirma tu cuenta de Corazón Salud',
        message: 'Confirma tu correo.', actionLabel: 'Confirmar mi cuenta',
        actionUrl: 'https://ruedelunbtaomhrzgelc.supabase.co/auth/v1/verify?token=secret' } },
    { provider: { emails: { send } }, env })
    expect(result.status).toBe('SENT')
    expect(send.mock.calls[0][0]).toMatchObject({ from: 'Corazón Salud <notifications@stratixsolutions.us>',
      subject: 'Confirma tu cuenta de Corazón Salud' })
  })

  it('uses the patient brand and a stable idempotency key for invoice mail', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'message-1' }, error: null })
    const provider = { emails: { send } }
    const recipient = 'patient@example.test'
    const message = await sendPatientEmail({ kind: 'invoice', eventId: 'invoice-1133', recipient,
      content: { title: 'Tu factura está disponible', message: 'Consulta tu factura en el Portal.',
        actionLabel: 'Ver mi pago', actionUrl: 'https://portal.corazonsalud.health/pagos' } },
    { provider, env })
    expect(message.status).toBe('SENT')
    expect(send).toHaveBeenCalledOnce()
    const [payload, options] = send.mock.calls[0]
    expect(payload.from).toBe('Corazón Salud <notifications@stratixsolutions.us>')
    expect(payload.subject).toBe('Tu pago de Corazón Salud está disponible')
    expect(payload.html).not.toMatch(/Stratix Meet|LILLY|CRM|Supabase/)
    expect(options.idempotencyKey).toBe('patient-invoice-invoice-1133')
  })

  it('sends recovery through the patient brand without exposing staff branding', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'message-recovery' }, error: null })
    const result = await sendPatientEmail({ kind: 'recovery', eventId: 'recovery-12345678',
      recipient: 'patient@example.test', content: { title: 'Restablece tu contraseña',
        message: 'Solicitaste recuperar tu acceso.', actionLabel: 'Restablecer contraseña',
        actionUrl: 'https://portal.corazonsalud.health/recuperar#token_hash=secret' } },
    { provider: { emails: { send } }, env })
    expect(result.status).toBe('SENT')
    const [payload, options] = send.mock.calls[0]
    expect(payload.from).toBe('Corazón Salud <notifications@stratixsolutions.us>')
    expect(payload.subject).toBe('Restablece tu contraseña de Corazón Salud')
    expect(payload.html).toContain('cori-official.png')
    expect(payload.html).toContain('Eminat Medical Center')
    expect(payload.html).toContain('Corazón Salud no es un seguro médico.')
    expect(payload.html).not.toMatch(/Stratix Meet|LILLY|CRM|Supabase/)
    expect(options.idempotencyKey).toBe('patient-recovery-recovery-12345678')
  })

  it('does not send when no approved sender is configured', async () => {
    const send = vi.fn()
    const result = await sendPatientEmail({ kind: 'welcome', eventId: 'patient-12345678',
      recipient: 'patient@example.test', content: { title: 'Bienvenido', message: 'Hola',
        actionLabel: 'Entrar', actionUrl: 'https://portal.corazonsalud.health/dashboard' } },
    { provider: { emails: { send } }, env: {} })
    expect(result.status).toBe('NOT_CONFIGURED')
    expect(send).not.toHaveBeenCalled()
  })
})
