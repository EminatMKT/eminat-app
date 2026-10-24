import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { NextResponse } from 'next/server'
import { PROFILE_UNAVAILABLE_STATUS } from '@/app/api/tasks/availability/constants'

const {
  requireModule,
  ssrClient,
} = vi.hoisted(() => ({ requireModule: vi.fn(), ssrClient: vi.fn() }))
vi.mock('@/shared/db/requireAccess/requireModule', () => ({ default: requireModule }))
vi.mock('@/shared/db/requireAccess/ssrClient', () => ({ default: ssrClient }))
import authorizeViewer from '.'

const AUTH_USER_ID = 'auth-1'
const VIEWER_ID = 'viewer-1'
const DENIED_STATUS = 403

function dbWithViewer(viewerId: string | null) {
  const viewerRow = viewerId === null ? null : { id: viewerId }
  const from = vi.fn(() => ({
    select: () => ({
      eq: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: viewerRow }) }),
      }),
    }),
  }))
  const dbHandle = { from }
  ssrClient.mockReturnValue(dbHandle)
  return dbHandle
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authorizeViewer', () => {
  it('denies access before touching the database', async () => {
    const deniedAccess = { ok: false, status: DENIED_STATUS, error: 'Forbidden' }
    requireModule.mockResolvedValue(deniedAccess)
    const result = await authorizeViewer()
    if (!(result instanceof NextResponse)) {
      throw new Error('expected a NextResponse')
    }
    expect(result.status).toBe(DENIED_STATUS)
    expect(ssrClient).not.toHaveBeenCalled()
  })

  it('rejects when the caller has no active profile', async () => {
    const grantedAccess = { ok: true, userId: AUTH_USER_ID }
    requireModule.mockResolvedValue(grantedAccess)
    dbWithViewer(null)
    const result = await authorizeViewer()
    if (!(result instanceof NextResponse)) {
      throw new Error('expected a NextResponse')
    }
    expect(result.status).toBe(PROFILE_UNAVAILABLE_STATUS)
  })

  it('resolves the viewer context when access and profile are both valid', async () => {
    const grantedAccess = { ok: true, userId: AUTH_USER_ID }
    requireModule.mockResolvedValue(grantedAccess)
    dbWithViewer(VIEWER_ID)
    const result = await authorizeViewer()
    if (result instanceof NextResponse) {
      throw new Error('expected a ViewerContext')
    }
    expect(result.viewerUserId).toBe(VIEWER_ID)
  })
})
