import { describe, it, expect, vi } from 'vitest'
import { signOutAndRedirect, loadProfile } from './index'

// ── A — logout a prueba de cuelgues ────────────────────────────────
describe('signOutAndRedirect', () => {
  it('redirige a /login cuando signOut resuelve normalmente', async () => {
    const redirect = vi.fn()
    await signOutAndRedirect(async () => {}, redirect)
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('redirige a /login aunque signOut rechace (error de red)', async () => {
    const redirect = vi.fn()
    await signOutAndRedirect(async () => { throw new Error('network down') }, redirect)
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('redirige a /login cuando signOut se cuelga más allá del timeout', async () => {
    vi.useFakeTimers()
    try {
      const redirect = vi.fn()
      const hanging = () => new Promise<void>(() => {}) // nunca resuelve
      const p = signOutAndRedirect(hanging, redirect, 3000)
      await vi.advanceTimersByTimeAsync(3000)
      await p
      expect(redirect).toHaveBeenCalledWith('/login')
    } finally {
      vi.useRealTimers()
    }
  })
})

// ── B — carga del perfil crítico, fail-closed ──────────────────────
function fakeClient(opts: {
  user?: { email: string } | null
  row?: any
  rowError?: any
  getUserThrows?: boolean
}) {
  return {
    auth: {
      getUser: async () => {
        if (opts.getUserThrows) throw new Error('boom')
        return { data: { user: opts.user ?? null } }
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: opts.row ?? null, error: opts.rowError ?? null }),
          }),
        }),
      }),
    }),
  }
}

describe('loadProfile', () => {
  it('devuelve el usuario cuando hay sesión y perfil activo', async () => {
    const client = fakeClient({ user: { email: 'f@eminat.net' }, row: { id: '1', nombre: 'Freddy', rol: 'superadmin' } })
    const res = await loadProfile(client as any)
    expect(res).toEqual({ ok: true, usuario: { id: '1', nombre: 'Freddy', rol: 'superadmin' } })
  })

  it('reporta no-session cuando no hay usuario autenticado', async () => {
    const client = fakeClient({ user: null })
    const res = await loadProfile(client as any)
    expect(res).toEqual({ ok: false, reason: 'no-session' })
  })

  it('reporta no-profile cuando no hay fila activa que matchee', async () => {
    const client = fakeClient({ user: { email: 'f@eminat.net' }, row: null, rowError: { code: 'PGRST116' } })
    const res = await loadProfile(client as any)
    expect(res).toEqual({ ok: false, reason: 'no-profile' })
  })

  it('reporta error cuando la consulta lanza una excepción', async () => {
    const client = fakeClient({ user: { email: 'f@eminat.net' }, getUserThrows: true })
    const res = await loadProfile(client as any)
    expect(res).toEqual({ ok: false, reason: 'error' })
  })
})
