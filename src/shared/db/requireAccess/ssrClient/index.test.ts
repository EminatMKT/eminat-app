import { describe, it, expect, vi } from 'vitest'
import type { createServerClient } from '@supabase/ssr'
import { clientEnv } from '@/shared/db/env.client'

const fakes = vi.hoisted(() => ({ jar: new Map<string, string>(), create: vi.fn<typeof createServerClient>() }))

vi.mock('next/headers', () => ({ cookies: () => ({ getAll: () => Array.from(fakes.jar,([name,value])=>({name,value})) }) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: fakes.create }))

import ssrClient from './index'

function lastCookieAdapter() {
  const [, , options] = fakes.create.mock.calls.at(-1) ?? []
  const adapter = options?.cookies
  return adapter?.getAll
}

describe('ssrClient', () => {
  it('builds the client with the public URL and the publishable key, never service_role', async () => {
    await ssrClient()
    const [url, key] = fakes.create.mock.calls.at(-1) ?? []
    expect(url).toBe(clientEnv.NEXT_PUBLIC_SUPABASE_URL)
    expect(key).toBe(clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  })
  it("reads the session from the request's cookies", async () => {
    fakes.jar.set('sb-token', 'abc')
    await ssrClient()
    const getAll = lastCookieAdapter()
    expect(await getAll?.()).toContainEqual({name:'sb-token',value:'abc'})
    expect(await getAll?.()).not.toContainEqual(expect.objectContaining({name:'missing'}))
  })
})
