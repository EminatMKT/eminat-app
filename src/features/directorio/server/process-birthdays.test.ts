import { beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({ send: vi.fn(), claims: new Set<string>(), logs: [] as Record<string, unknown>[], active: true, confirmed: true }))
vi.mock('resend', () => ({ Resend: class { emails = { send: mock.send } } }))
vi.mock('@/shared/db/env.server', () => ({ serverEnv: { RESEND_API_KEY: 're_synthetic', TASK_NOTIFY_FROM_EMAIL: 'LILLY <qa@example.com>' } }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: () => ({ from: (table: string) => ({
  select: () => ({
    eq: (...args: unknown[]) => {
      const query = {
        eq: () => query,
        then: (resolve: (value: unknown) => void) => resolve(table === 'usuario_perfil_privado'
          ? { data: mock.confirmed ? [{ usuario_id: 'person-1' }] : [], error: null } : { data: null, error: null }),
        maybeSingle: async () => table === 'usuarios'
          ? { data: { id: 'person-1', nombre: 'Tasha', email: 'tasha@example.com', activo: mock.active }, error: null }
          : { data: { cumple_confirmado: mock.confirmed, cumple_mes: 2, cumple_dia: 19 }, error: null },
      }
      void args
      return query
    },
  }),
  insert: (row: Record<string, unknown>) => ({ select: () => ({ single: async () => {
    if (mock.claims.has(String(row.dedupe_key))) return { data: null, error: { code: '23505' } }
    mock.claims.add(String(row.dedupe_key)); mock.logs.push({ ...row, id: 'log-1' })
    return { data: { id: 'log-1' }, error: null }
  } }) }),
  update: (row: Record<string, unknown>) => ({ eq: async () => {
    Object.assign(mock.logs[0], row)
    return { error: null }
  } }),
}) }) }))

import processBirthdays from './process-birthdays'

describe('birthday worker', () => {
  beforeEach(() => { mock.claims.clear(); mock.logs.length = 0; mock.send.mockReset(); mock.active = true; mock.confirmed = true })

  it('records provider ID and refuses a second send in the same year', async () => {
    mock.send.mockResolvedValue({ data: { id: 'provider-123' }, error: null })
    const now = new Date('2026-02-19T14:00:00Z')
    expect((await processBirthdays(now)).sent).toBe(1)
    expect((await processBirthdays(now)).skipped).toBe(1)
    expect(mock.send).toHaveBeenCalledTimes(1)
    expect(mock.logs[0]).toMatchObject({ dedupe_key: 'birthday/person-1/2026', status: 'sent', provider_message_id: 'provider-123' })
  })

  it('does not claim or email an inactive user or an unconfirmed birthday', async () => {
    mock.active = false
    expect((await processBirthdays(new Date('2026-02-19T14:00:00Z'))).skipped).toBe(1)
    mock.active = true; mock.confirmed = false
    expect((await processBirthdays(new Date('2026-02-19T14:00:00Z'))).sent).toBe(0)
    expect(mock.logs).toHaveLength(0)
    expect(mock.send).not.toHaveBeenCalled()
  })
})
