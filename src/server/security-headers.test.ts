import { expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

it('builds explicit Production security headers without eval or wildcard origins', () => {
  const result = JSON.parse(execFileSync(process.execPath, ['-e', "console.log(JSON.stringify(require('./security-headers.cjs')))"], { env: { ...process.env, NODE_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: 'https://ruedelunbtaomhrzgelc.supabase.co' }, encoding: 'utf8' }))
  expect(result.csp).not.toContain('unsafe-eval')
  expect(result.csp).not.toContain('*')
  expect(result.csp).toContain("frame-ancestors 'none'")
  expect(result.csp).toContain('wss://ruedelunbtaomhrzgelc.supabase.co')
  expect(result.csp).not.toContain('localhost')
})
it('keeps every current public inline script covered by its exact hash', () => {
  const root = 'docs/releases/security-privacy/'
  const headers = JSON.parse(readFileSync(root + 'public-security-headers.json', 'utf8'))
  for (const file of ['homepage-unchanged.html', 'public/privacy/index.html']) {
    const html = readFileSync(root + file, 'utf8')
    for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      if (/\bsrc\s*=/i.test(attrs)) continue
      const hash = createHash('sha256').update(body).digest('base64')
      expect(headers['Content-Security-Policy']).toContain(`'sha256-${hash}'`)
    }
  }
})
it('keeps Privacy as a factual website/portal policy without legacy backend or disconnected-QBO claims', () => {
  const html = readFileSync('docs/releases/security-privacy/public/privacy/index.html', 'utf8')
  expect(html).not.toMatch(/ANNIE|currently disconnected|HIPAA compliant|HIPAA certified/)
  expect(html).toContain('not a HIPAA Notice of Privacy Practices')
  expect(html).toContain('QuickBooks Online Production is connected')
})
