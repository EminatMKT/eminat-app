import { describe, it, expect, vi } from 'vitest'
import { ADMIN_ERRORS } from '@/shared/errors'
import rollback from './rollback'

const FAILURE = { message: 'duplicate key', code: '23505' }

describe('rollback', () => {
  it('deletes the Auth account and answers the row failure saying it was reverted', async () => {
    const deleteAuth = vi.fn().mockResolvedValue(null)
    const result = await rollback({ deleteAuth }, FAILURE, 'a-1')
    expect(deleteAuth).toHaveBeenCalledWith('a-1')
    expect(result).toEqual({
      ok: false,
      error: 'authRollbackDone',
      message: `duplicate key.${ADMIN_ERRORS.authRollbackDone}`,
      extra: { dbErrorCode: '23505' },
    })
  })
  it('when the undo also fails, names the orphan Auth id to clean up by hand', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const deleteAuth = vi.fn().mockResolvedValue({ message: 'boom' })
    const result = await rollback({ deleteAuth }, FAILURE, 'a-1')
    expect(result.error).toBe('authRollbackFailed')
    expect(result.message).toBe(`duplicate key.${ADMIN_ERRORS.authRollbackFailed('boom', 'a-1')}`)
  })
})
