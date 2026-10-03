import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Usuario } from '@/shared/context/loadAppData'

type Row = Pick<Usuario, 'id' | 'rol' | 'activo' | 'validado'>

const fakes = vi.hoisted(() => {
  const fake = {
    setAdminUsuarios: vi.fn(),
    mostrarMensaje: vi.fn(),
    apiPost: vi.fn(),
    validar: vi.fn(),
  }
  return fake
})
vi.mock('@/shared/context/AppContext', () => ({
  useApp: () => ({ setAdminUsuarios: fakes.setAdminUsuarios, mostrarMensaje: fakes.mostrarMensaje }),
}))
vi.mock('@/shared/utils/api', () => ({ apiPost: fakes.apiPost }))
vi.mock('@/shared/data', () => ({ usuariosRepo: { validar: fakes.validar } }))
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

import useUserActions from '.'

const UPDATE_URL = expect.stringMatching(/^\/api\/admin\/update-user$/)
const ANA: Row = {
  id: 'u-1',
  rol: 'mkt',
  activo: true,
  validado: false,
}
const BETO: Row = { ...ANA, id: 'u-2', validado: true }
const LIST = [ANA, BETO]
const answer = (ok: boolean, error?: string) => ({ res: { ok }, result: { error } })
const patched = (): Row[] => {
  const patch: (prev: Row[]) => Row[] = fakes.setAdminUsuarios.mock.calls[0][0]
  return patch(LIST)
}

describe('useUserActions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })
  it('changeRole posts the new role and patches only that row', async () => {
    fakes.apiPost.mockResolvedValue(answer(true))
    await useUserActions().changeRole(ANA.id, 'admin')
    expect(fakes.apiPost).toHaveBeenCalledWith(UPDATE_URL, { id: ANA.id, rol: 'admin' })
    expect(patched()).toEqual([{ ...ANA, rol: 'admin' }, BETO])
    expect(fakes.mostrarMensaje).toHaveBeenCalledWith('ok', 'admin.user.roleUpdated')
  })
  it('a rejected role change shows the server error and leaves the list alone', async () => {
    fakes.apiPost.mockResolvedValue(answer(false, 'The last admin cannot be demoted.'))
    await useUserActions().changeRole(ANA.id, 'sin_asignar')
    expect(fakes.setAdminUsuarios).not.toHaveBeenCalled()
    expect(fakes.mostrarMensaje).toHaveBeenCalledWith('error', 'The last admin cannot be demoted.')
  })
  it('toggleActive flips the flag it was given and says which way it went', async () => {
    fakes.apiPost.mockResolvedValue(answer(true))
    await useUserActions().toggleActive(ANA.id, true)
    expect(fakes.apiPost).toHaveBeenCalledWith(UPDATE_URL, { id: ANA.id, activo: false })
    expect(patched()[0].activo).toBe(false)
    expect(fakes.mostrarMensaje).toHaveBeenCalledWith('ok', 'admin.user.deactivated')
  })
  it('a network failure while toggling shows its message', async () => {
    fakes.apiPost.mockRejectedValue(new Error('offline'))
    await useUserActions().toggleActive(ANA.id, false)
    expect(fakes.mostrarMensaje).toHaveBeenCalledWith('error', 'offline')
  })
  it('validateUser validates and activates the row', async () => {
    await useUserActions().validateUser(ANA.id)
    expect(fakes.validar).toHaveBeenCalledWith(ANA.id)
    expect(patched()[0]).toMatchObject({ validado: true, activo: true })
  })
})
