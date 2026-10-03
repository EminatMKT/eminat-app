import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DEFAULT_ROLE } from '@/shared/auth/permissions'
import finish from './finish'

const fakes = vi.hoisted(() => {
  const repo = {
    syncCargos: vi.fn(),
    cargoNames: vi.fn(),
    roleLabel: vi.fn(),
  }
  const fake = { repo, sendWelcome: vi.fn() }
  return fake
})
const INPUT = {
  email: 'ana@eminat.net',
  password: 'secret-123',
  nombre: 'Ana',
  apellido: 'Paz',
}
const EXISTING = {
  id: 'u-old',
  auth_id: null,
  nombre: 'Ana',
  apellido: 'Paz',
}
const WELCOME = { email: 'ana@eminat.net', areaLabel: 'Marketing', cargo: 'Editor' }

describe('finish', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    fakes.repo.cargoNames.mockResolvedValue('Editor')
    fakes.repo.roleLabel.mockResolvedValue('Marketing')
    fakes.sendWelcome.mockResolvedValue(null)
  })
  it('a new user gets the chosen cargos synced, and the welcome email with role label and cargos', async () => {
    expect(await finish({ ...INPUT, cargoIds: ['c-1'] }, null, 'a-1', fakes)).toBeNull()
    expect(fakes.repo.syncCargos).toHaveBeenCalledWith('a-1', ['c-1'])
    expect(fakes.sendWelcome.mock.calls[0][0]).toMatchObject(WELCOME)
  })
  it('linking with no cargos chosen does not wipe the ones the person had', async () => {
    await finish(INPUT, EXISTING, 'a-1', fakes)
    expect(fakes.repo.syncCargos).not.toHaveBeenCalled()
  })
  it('linking with cargos syncs them on the existing row id, not the Auth id', async () => {
    await finish({ ...INPUT, cargoIds: ['c-1'] }, EXISTING, 'a-1', fakes)
    expect(fakes.repo.syncCargos).toHaveBeenCalledWith('u-old', ['c-1'])
  })
  it('a role without a label row is shown by its key; the email warning comes back', async () => {
    fakes.repo.roleLabel.mockResolvedValue(null)
    fakes.sendWelcome.mockResolvedValue('Email not sent.')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(await finish(INPUT, null, 'a-1', fakes)).toBe('Email not sent.')
    expect(fakes.repo.roleLabel).toHaveBeenCalledWith(DEFAULT_ROLE)
    expect(fakes.sendWelcome.mock.calls[0][0].areaLabel).toBe(DEFAULT_ROLE)
  })
})
