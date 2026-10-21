import { describe, expect, it, vi } from 'vitest'
import { sendPatientEmail } from './patient-email-delivery'

const env = { PATIENT_EMAIL_FROM_ADDRESS: 'notifications@stratixsolutions.us' }

describe('Patient Portal transactional email', () => {
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
