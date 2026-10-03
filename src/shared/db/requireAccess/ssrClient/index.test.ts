import { describe, it, expect, vi } from 'vitest'
import type { createServerClient } from '@supabase/ssr'
import { clientEnv } from '@/shared/db/env.client'

const fakes = vi.hoisted(() => ({ jar: new Map<string, string>(), create: vi.fn<typeof createServerClient>() }))

function readCookie(name: string) {
  const value = fakes.jar.get(name)
  const found = value === undefined ? undefined : { value }
  return found
}

vi.mock('next/headers', () => ({ cookies: () => ({ get: readCookie }) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: fakes.create }))

import ssrClient from './index'

function lastCookieAdapter() {
  const [, , options] = fakes.create.mock.calls.at(-1) ?? []
  const adapter = options?.cookies
  const get = adapter && 'get' in adapter ? adapter.get : undefined
  return get
}

describe('ssrClient', () => {
  it('builds the client with the public URL and the publishable key, never service_role', () => {
    ssrClient()
    const [url, key] = fakes.create.mock.calls.at(-1) ?? []
    expect(url).toBe(clientEnv.NEXT_PUBLIC_SUPABASE_URL)
    expect(key).toBe(clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  })
  it("reads the session from the request's cookies", () => {
    fakes.jar.set('sb-token', 'abc')
    ssrClient()
    const get = lastCookieAdapter()
    expect(get?.('sb-token')).toBe('abc')
    expect(get?.('missing')).toBeUndefined()
  })
})
