import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'

afterEach(() => vi.unstubAllEnvs())
const request = (path: string, authenticated = false) => new NextRequest(`https://lilly.example${path}`, {
  headers: authenticated ? { cookie: 'sb-local-auth-token=synthetic' } : {},
})

describe('Sales entry without retired QA gate', () => {
  it.each([undefined, 'false', 'true'])('never gates authenticated /sales on legacy flag %s', flag => {
    vi.stubEnv('ANNIE_SALES_QA_ENABLED', flag)
    const response = middleware(request('/sales', true))
    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('preserves existing authentication redirects for Sales and other modules', () => {
    for (const path of ['/sales', '/sales-native', '/tasks', '/medical', '/admin']) {
      expect(middleware(request(path)).headers.get('location')).toBe('https://lilly.example/login')
    }
    expect(middleware(request('/login', true)).headers.get('location')).toBe('https://lilly.example/')
    expect(middleware(request('/login')).status).toBe(200)
  })
})
