import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { createHash } from 'node:crypto'
import { recordPrivilegedAction } from './privileged-audit'
const actor = '00000000-0000-4000-8000-000000000001'
beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
it('persists actor and correlated metadata while rejecting raw values and hashing role keys', async () => {
  const append = vi.fn().mockResolvedValue({ error: null })
  const rpc = vi.fn().mockReturnValue({ abortSignal: append })
  const result = await recordPrivilegedAction({ rpc }, { action: 'admin.role.updated', actorId: actor,
    roleKey: 'private-person@example.invalid', changedFields: ['modules', 'password', 'access_token', 'private-canary', 'modules'] })
  expect(result.persisted).toBe(true)
  expect(rpc).toHaveBeenCalledWith('native_security_append_privileged_event', {
    p_request_id: result.requestId, p_action: 'admin.role.updated', p_actor_id: actor,
    p_organization_id: null, p_resource_id: null,
    p_resource_key_digest: createHash('sha256').update('private-person@example.invalid').digest('hex'),
    p_changed_fields: ['modules'],
  })
  expect(append.mock.calls[0][0]).toBeInstanceOf(AbortSignal)
  expect(JSON.stringify([rpc.mock.calls, vi.mocked(console.info).mock.calls])).not.toMatch(/private-person|private-canary|password|access_token/)
})
it('does not propagate append failures or log provider bodies', async () => {
  const rpc = vi.fn().mockReturnValue({ abortSignal: () => Promise.reject(new Error('secret-private-canary')) })
  const result = await recordPrivilegedAction({ rpc }, { action: 'admin.user.updated', actorId: actor })
  expect(result.persisted).toBe(false)
  expect(console.warn).toHaveBeenCalledWith('PRIVILEGED_AUDIT_NOT_PERSISTED', { requestId: result.requestId, reason: 'APPEND_UNAVAILABLE' })
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('secret-private-canary')
})
it('does not invent an actor when authentication supplied an invalid identifier', async () => {
  const rpc = vi.fn()
  const result = await recordPrivilegedAction({ rpc }, { action: 'admin.user.updated', actorId: 'private-canary' })
  expect(result.persisted).toBe(false)
  expect(rpc).not.toHaveBeenCalled()
  expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain('private-canary')
})
