import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { NextResponse } from 'next/server'
import type { Access } from '@/shared/db/types'
import { PROFILE_UNAVAILABLE_STATUS } from '@/app/api/tasks/availability/constants'
import {
  DENIED_ACCESS,
  DENIED_STATUS,
  GRANTED_ACCESS,
  VIEWER_ID,
} from '@/app/api/tasks/availability/helpers/test-fixtures/constants'
import authorizeViewer from '.'

// Named via vi.hoisted so the path exists before Vitest hoists the vi.mock call below it.
const { SSR_CLIENT_MODULE, ssrClient } = vi.hoisted(() => ({
  SSR_CLIENT_MODULE: '@/shared/db/requireAccess/ssrClient',
  ssrClient: vi.fn(),
}))

vi.mock(SSR_CLIENT_MODULE, () => ({ default: ssrClient }))

function dbWithViewer(viewerId: string | null) {
  const viewerRow = viewerId === null ? null : { id: viewerId }
  const maybeSingle = async () => ({ data: viewerRow })
  const select = () => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) })
  const dbHandle = { from: vi.fn(() => ({ select })) }

  ssrClient.mockReturnValue(dbHandle)
}

async function statusOf(access: Access) {
  const result = await authorizeViewer(access)

  return result instanceof NextResponse ? result.status : null
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authorizeViewer', () => {
  it('denies access before touching the database', async () => {
    expect(await statusOf(DENIED_ACCESS)).toBe(DENIED_STATUS)
    expect(ssrClient).not.toHaveBeenCalled()
  })

  it('rejects when the caller has no active profile', async () => {
    dbWithViewer(null)
    expect(await statusOf(GRANTED_ACCESS)).toBe(PROFILE_UNAVAILABLE_STATUS)
  })

  it('resolves the viewer context when access and profile are both valid', async () => {
    const expectedContext = { viewerUserId: VIEWER_ID }

    dbWithViewer(VIEWER_ID)

    const result = await authorizeViewer(GRANTED_ACCESS)

    expect(result).not.toBeInstanceOf(NextResponse)
    expect(result).toMatchObject(expectedContext)
  })
})
