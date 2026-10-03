import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ADMIN_ERRORS } from '@/shared/errors'

const fakes = vi.hoisted(() => ({
  env: { RESEND_API_KEY: 're_test', NEXT_PUBLIC_APP_ENV: 'production' },
  send: vi.fn(),
}))
vi.mock('@/server/db', () => ({ serverEnv: fakes.env, clientEnv: fakes.env }))
vi.mock('resend', () => ({ Resend: class { emails = { send: fakes.send } } }))

import sendWelcomeEmail from './index'

const ARGS = {
  nombre: 'Ana',
  apellido: 'Paz',
  email: 'ana@eminat.net',
  password: 'secret-123',
  areaLabel: 'Marketing',
}
const SENT = { to: 'ana@eminat.net', subject: 'Tu acceso a Stratix Solutions' }

describe('sendWelcomeEmail', () => {
  beforeEach(() => {
    fakes.send.mockReset()
    fakes.env.RESEND_API_KEY = 're_test'
    fakes.env.NEXT_PUBLIC_APP_ENV = 'production'
  })
  it('without a Resend key nothing is sent and the admin is warned', async () => {
    fakes.env.RESEND_API_KEY = undefined
    expect(await sendWelcomeEmail(ARGS)).toBe(ADMIN_ERRORS.emailMissingKey)
    expect(fakes.send).not.toHaveBeenCalled()
  })
  it('outside production nothing is sent: the inbox is a real colleague', async () => {
    fakes.env.NEXT_PUBLIC_APP_ENV = 'local'
    expect(await sendWelcomeEmail(ARGS)).toBe(ADMIN_ERRORS.emailNotProduction('local'))
    expect(fakes.send).not.toHaveBeenCalled()
  })
  it('in production it sends to the person, with the coordinator in cc', async () => {
    fakes.send.mockResolvedValueOnce({ error: null })
    expect(await sendWelcomeEmail(ARGS)).toBeNull()
    expect(fakes.send.mock.calls[0][0]).toMatchObject(SENT)
  })
  it('a Resend error or a throw becomes a warning, never a failure', async () => {
    fakes.send.mockResolvedValueOnce({ error: { message: 'quota' } })
    expect(await sendWelcomeEmail(ARGS)).toBe(ADMIN_ERRORS.emailFailed('quota'))
    fakes.send.mockRejectedValueOnce(new Error(''))
    expect(await sendWelcomeEmail(ARGS)).toBe(ADMIN_ERRORS.emailFailed(ADMIN_ERRORS.emailUnknownError))
  })
})
