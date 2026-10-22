import { describe, expect, it } from 'vitest'
import { renderPatientEmail } from './patient-email-template'

describe('Corazón Salud patient email', () => {
  it('renders the official identity without internal branding', () => {
    const email = renderPatientEmail({ title: 'Confirma tu cuenta de Corazón Salud',
      message: 'Tu cuenta está lista para confirmar.', actionLabel: 'Confirmar cuenta',
      actionUrl: 'https://portal.corazonsalud.health/login' })
    expect(email.html).toContain('cori-official.png')
    expect(email.html).toContain('corazon-salud.svg')
    expect(email.html).toContain('emc_logo_white.svg')
    expect(email.html).toContain('Corazón Salud no es un seguro médico.')
    expect(email.html).not.toMatch(/Stratix Meet|LILLY|Opportunity|Supabase/)
  })

  it('escapes patient details and rejects unrelated links', () => {
    const email = renderPatientEmail({ title: 'Tu membresía', message: 'Hola',
      actionLabel: 'Ver Portal', actionUrl: 'https://portal.corazonsalud.health/dashboard',
      details: [{ label: 'Nombre', value: '<script>alert(1)</script>' }] })
    expect(email.html).toContain('&lt;script&gt;')
    expect(email.html).not.toContain('<script>')
    expect(() => renderPatientEmail({ title: 'Pago', message: 'Hola', actionLabel: 'Pagar',
      actionUrl: 'https://example.com' })).toThrow('PATIENT_EMAIL_LINK_INVALID')
  })
})
