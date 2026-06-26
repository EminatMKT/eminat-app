import { describe, it, expect, vi, beforeEach } from 'vitest'

// Resiliencia: si la carga de roles (posterior al perfil) se cuelga, `loading`
// debe resolverse igual — nunca dejar el spinner "Cargando…" para siempre.
// Mockeamos las dependencias de loadAppData para aislar startAppData.
vi.mock('@/shared/db/supabase', () => ({ supabase: {} }))
vi.mock('@/shared/db/session', () => ({
  loadProfile: vi.fn(async () => ({ ok: true, usuario: { id: 'u1', rol: 'admin' } })),
}))
vi.mock('@/shared/db/auth', () => ({ signOut: vi.fn(async () => {}) }))
vi.mock('@/shared/db/clearAuthCookies', () => ({ clearAuthCookies: vi.fn() }))

vi.mock('@/shared/data', () => {
  const hang = () => new Promise(() => {}) // nunca resuelve
  return {
    rolesRepo: { listRoles: vi.fn(hang), listRoleModules: vi.fn(hang) },
    usuariosRepo: {},
    actividadesRepo: {},
    notificacionesRepo: {},
  }
})

import { startAppData } from './loadAppData'

function setters() {
  return {
    setUsuario: vi.fn(), setSessionError: vi.fn(), setLoading: vi.fn(), setOnlineCount: vi.fn(),
    setNotificaciones: vi.fn(), setActividades: vi.fn(), setEquipo: vi.fn(), setUsuarios: vi.fn(),
    setAdminUsuarios: vi.fn(), setRoles: vi.fn(), setRoleModuleMap: vi.fn(),
  }
}

describe('startAppData — resiliencia del loading', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resuelve loading=false (pantalla de error) aunque la carga de roles se cuelgue', async () => {
    vi.useFakeTimers()
    try {
      const s = setters()
      startAppData(s as any)
      // Deja correr el perfil (resuelve ok) y luego vence el timeout de roles.
      await vi.advanceTimersByTimeAsync(15000)
      expect(s.setUsuario).toHaveBeenCalled()           // perfil cargó
      expect(s.setLoading).toHaveBeenCalledWith(false)  // el spinner SIEMPRE se suelta
      expect(s.setSessionError).toHaveBeenCalledWith('error') // cae a pantalla estable
    } finally {
      vi.useRealTimers()
    }
  })
})
