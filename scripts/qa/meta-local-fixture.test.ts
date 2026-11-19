import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanupApprovedMetaFixture, createApprovedLocalFixture, LOCAL_ANON, LOCAL_DATABASE,
  LOCAL_SERVICE, type LocalFixtureEnvironment, type FixtureTransport } from '../../e2e/support/approved-local-fixture'

const names = ['native_sales_claim_social_leads', 'native_sales_receive_social_event', 'native_sales_retry_social_lead']
function valid(): LocalFixtureEnvironment {
  return { CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted',
    GITHUB_REPOSITORY: 'EminatMKT/eminat-app', GITHUB_JOB: 'e2e-shard', GITHUB_RUN_ID: '123456',
    NEXT_PUBLIC_APP_ENV: 'local', NEXT_PUBLIC_SUPABASE_URL: LOCAL_DATABASE,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: LOCAL_ANON, SUPABASE_SECRET_KEY: LOCAL_SERVICE }
}
function mockTransport() {
  return vi.fn<FixtureTransport>(async input => String(input).includes('sales_social_phase1_rpc_backup')
    ? Response.json(names.map(name => ({ name }))) : Response.json([]))
}
const invalid: [string, LocalFixtureEnvironment][] = [
  ...Object.keys(valid()).map(key => {
    const env = valid(); delete env[key]; return [`missing ${key}`, env] as [string, LocalFixtureEnvironment]
  }),
  ...['', 'not a URL', 'https://ruedelunbtaomhrzgelc.supabase.co', 'https://other.supabase.co',
    'http://localhost:54321', 'http://127.0.0.1:54322', 'https://127.0.0.1:54321',
    'http://127.0.0.1.evil.invalid:54321', 'http://user:password@127.0.0.1:54321',
    'http://127.0.0.1:54321/rest/v1', 'http://127.0.0.1:54321?target=remote',
    'http://127.0.0.1:54321#remote', ' http://127.0.0.1:54321'].map(url =>
    [`rejected URL ${url}`, { ...valid(), NEXT_PUBLIC_SUPABASE_URL: url }] as [string, LocalFixtureEnvironment]),
  ['unapproved developer database', { ...valid(), CI: 'false' }],
  ['unapproved self-hosted database', { ...valid(), RUNNER_ENVIRONMENT: 'self-hosted' }],
  ['unapproved repository', { ...valid(), GITHUB_REPOSITORY: 'other/repository' }],
  ['unapproved job', { ...valid(), GITHUB_JOB: 'deployment' }],
  ['malformed run identity', { ...valid(), GITHUB_RUN_ID: 'not-a-run' }],
  ['Production tier', { ...valid(), NEXT_PUBLIC_APP_ENV: 'production' }],
  ['Production runtime', { ...valid(), NODE_ENV: 'production' }],
  ['hosted runtime', { ...valid(), VERCEL_ENV: 'preview' }],
  ['hosted target', { ...valid(), VERCEL_TARGET_ENV: 'production' }],
  ['private service key', { ...valid(), SUPABASE_SECRET_KEY: 'rejected-private-credential' }],
  ['wrong role', { ...valid(), SUPABASE_SECRET_KEY: LOCAL_ANON }],
  ['wrong public key', { ...valid(), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: LOCAL_SERVICE }],
  ['conflicting service alias', { ...valid(), SUPABASE_SERVICE_ROLE_KEY: 'rejected-alias' }],
  ['conflicting public alias', { ...valid(), NEXT_PUBLIC_SUPABASE_ANON_KEY: 'rejected-alias' }],
  ['shadow database URL', { ...valid(), DATABASE_URL: 'postgresql://rejected.invalid/database' }],
  ['remote QA approval', { ...valid(), LILLY_ISOLATED_QA_APPROVAL_ID: 'not-local' }],
]
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('Meta local fixture setup and destructive boundaries', () => {
  it.each(invalid)('failed setup and afterAll make zero requests: %s', async (_label, env) => {
    const transport = mockTransport()
    const client = createApprovedLocalFixture(() => env, () => 'http://localhost:3000', transport)
    try { await client.approve(); throw new Error('SETUP_SHOULD_HAVE_FAILED') }
    catch (error) { expect((error as Error).message).toBe('LOCAL_FIXTURE_NOT_APPROVED') }
    await cleanupApprovedMetaFixture(client, () => client.request('/rest/v1/usuarios?id=eq.synthetic', { method: 'DELETE' }).then(() => {}))
    await expect(client.request('/auth/v1/admin/users/synthetic', { method: 'DELETE' })).rejects.toThrow('LOCAL_FIXTURE_NOT_APPROVED')
    expect(transport).not.toHaveBeenCalled()
  })
  it.each([undefined, '', 'malformed', 'https://app.stratixsolutions.us', 'http://localhost:3001'])('rejects missing or mismatched app target %s', async app => {
    const transport = mockTransport()
    const client = createApprovedLocalFixture(valid, () => app, transport)
    await expect(client.approve()).rejects.toThrow('LOCAL_FIXTURE_NOT_APPROVED')
    await cleanupApprovedMetaFixture(client, async () => { await client.request('/rest/v1/usuarios', { method: 'DELETE' }) })
    expect(transport).not.toHaveBeenCalled()
  })
  it.each([401, 500, 302])('failed read-only target probe cannot authorize cleanup: %s', async status => {
    const transport = vi.fn<FixtureTransport>(async () => new Response('', { status }))
    const client = createApprovedLocalFixture(valid, () => 'http://localhost:3000', transport)
    await expect(client.approve()).rejects.toThrow('LOCAL_FIXTURE_NOT_APPROVED')
    await cleanupApprovedMetaFixture(client, async () => { await client.request('/rest/v1/usuarios', { method: 'DELETE' }) })
    expect(transport).toHaveBeenCalledTimes(1)
    expect(transport.mock.calls[0][1]?.method ?? 'GET').toBe('GET')
    expect(transport.mock.calls[0][1]?.redirect).toBe('error')
  })
  it('does not treat an unrelated or empty local schema as approved', async () => {
    const transport = vi.fn<FixtureTransport>(async () => Response.json([]))
    const client = createApprovedLocalFixture(valid, () => 'http://localhost:3000', transport)
    await expect(client.approve()).rejects.toThrow('LOCAL_FIXTURE_NOT_APPROVED')
    expect(client.cleanupAllowed()).toBe(false)
  })
  it('cleans partial setup after validation but skips cleanup when setup never mutated fixtures', async () => {
    const transport = mockTransport()
    const client = createApprovedLocalFixture(valid, () => 'http://localhost:3000', transport)
    await client.approve()
    const work = vi.fn(async () => { await client.request('/rest/v1/usuarios?id=eq.synthetic', { method: 'DELETE' }) })
    await cleanupApprovedMetaFixture(client, work)
    expect(work).not.toHaveBeenCalled()
    await client.request('/rest/v1/usuarios', { method: 'POST', body: '{}' })
    // Intentional setup failure after partial writes; safe cleanup must still be available.
    await expect((async () => {
      try { throw new Error('SYNTHETIC_SETUP_FAILURE') }
      finally { await cleanupApprovedMetaFixture(client, work) }
    })()).rejects.toThrow('SYNTHETIC_SETUP_FAILURE')
    expect(work).toHaveBeenCalledTimes(1)
    expect(transport.mock.calls.at(-1)?.[1]?.method).toBe('DELETE')
  })
  it('revalidates each destructive boundary and does not reuse a rejected credential', async () => {
    const env = valid(), transport = mockTransport()
    const client = createApprovedLocalFixture(() => env, () => 'http://localhost:3000', transport)
    await client.approve()
    await client.request('/rest/v1/usuarios', { method: 'POST', body: '{}' })
    transport.mockClear().mockImplementation(async () => {
      env.SUPABASE_SECRET_KEY = 'rejected-after-first-cleanup'
      return Response.json([])
    })
    await expect(cleanupApprovedMetaFixture(client, async () => {
      await client.request('/rest/v1/usuarios?id=eq.synthetic', { method: 'DELETE' })
      await client.request('/auth/v1/admin/users/synthetic', { method: 'DELETE' })
    })).rejects.toThrow('LOCAL_FIXTURE_NOT_APPROVED')
    expect(transport).toHaveBeenCalledTimes(1)
    expect(new Headers(transport.mock.calls[0][1]?.headers).get('authorization')).toBe(`Bearer ${LOCAL_SERVICE}`)
    expect(transport.mock.calls[0][1]?.redirect).toBe('error')
  })
  it.each(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_APP_ENV'])('rejected changed binding prevents teardown: %s', async key => {
    const env = valid(), transport = mockTransport()
    const client = createApprovedLocalFixture(() => env, () => 'http://localhost:3000', transport)
    await client.approve(); await client.request('/rest/v1/usuarios', { method: 'POST', body: '{}' })
    transport.mockClear(); env[key] = 'rejected-changed-binding'
    await cleanupApprovedMetaFixture(client, async () => { await client.request('/auth/v1/admin/users/synthetic', { method: 'DELETE' }) })
    expect(transport).not.toHaveBeenCalled()
  })
  it.each(['https://remote.invalid/rest/v1/usuarios', '//remote.invalid/rest/v1/usuarios', '/unapproved-path'])('refuses a destructive request outside the approved route: %s', async path => {
    const transport = mockTransport(), client = createApprovedLocalFixture(valid, () => 'http://localhost:3000', transport)
    await client.approve(); transport.mockClear()
    await expect(client.request(path, { method: 'DELETE' })).rejects.toThrow('LOCAL_FIXTURE_NOT_APPROVED')
    expect(transport).not.toHaveBeenCalled()
  })
  it('blocks caller-supplied rejected service credentials before transport', async () => {
    const transport = mockTransport(), client = createApprovedLocalFixture(valid, () => 'http://localhost:3000', transport)
    await client.approve(); transport.mockClear()
    await expect(client.request('/rest/v1/usuarios', { method: 'DELETE', headers: { Authorization: 'Bearer rejected-private' } })).rejects.toThrow('LOCAL_FIXTURE_NOT_APPROVED')
    expect(transport).not.toHaveBeenCalled()
  })
  it('shared user deletion helpers also reject a remote target before any read or delete', async () => {
    const transport = mockTransport()
    vi.stubGlobal('fetch', transport)
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://rejected.invalid')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'rejected-private')
    vi.resetModules()
    const { deleteUser } = await import('../../e2e/seed')
    await expect(deleteUser('synthetic@example.invalid')).rejects.toThrow('LOCAL_FIXTURE_NOT_APPROVED')
    expect(transport).not.toHaveBeenCalled()
  })
})

// Exercise real Playwright beforeAll failure -> afterAll, with a recording transport and
// no web server, browser, database or network. The same cleanup helper is used by the spec.
describe('actual Playwright failed-setup lifecycle', () => {
  it.each(['missing', 'remote', 'Production'])('runs afterAll with zero destructive requests after %s setup rejection', mode => {
    const directory = mkdtempSync(join(tmpdir(), 'meta-cleanup-rejection-'))
    const require = createRequire(import.meta.url)
    const playwright = require.resolve('@playwright/test')
    const cli = resolve(playwright, '..', 'cli.js')
    const report = join(directory, 'requests.json')
    const env = mode === 'missing' ? {} : { ...valid(), NEXT_PUBLIC_SUPABASE_URL:
      mode === 'remote' ? 'https://rejected.invalid' : 'https://ruedelunbtaomhrzgelc.supabase.co' }
    try {
      writeFileSync(join(directory, 'playwright.config.cjs'), `module.exports={testDir:__dirname,testMatch:'failed-setup.fixture.ts',workers:1,retries:0,timeout:5000,reporter:'line',outputDir:${JSON.stringify(join(directory, 'output'))}}`)
      writeFileSync(join(directory, 'failed-setup.fixture.ts'), `
import {test} from ${JSON.stringify(playwright)}
import {writeFileSync} from 'node:fs'
import {createApprovedLocalFixture,cleanupApprovedMetaFixture} from ${JSON.stringify(resolve('e2e/support/approved-local-fixture.ts'))}
const requests: string[]=[]
const client=createApprovedLocalFixture(()=>(${JSON.stringify(env)}),()=>'http://localhost:3000',async (_url,init)=>{requests.push(init?.method??'GET');throw new Error('NETWORK_FORBIDDEN')})
test.beforeAll(async()=>{await client.approve()})
test.afterAll(async()=>{try{await cleanupApprovedMetaFixture(client,async()=>{await client.request('/rest/v1/usuarios',{method:'DELETE'})})}finally{writeFileSync(${JSON.stringify(report)},JSON.stringify({afterAllRan:true,requests}))}})
test('intentionally rejected setup',()=>{})
`)
      const child = spawnSync(process.execPath, [cli, 'test', '--config', join(directory, 'playwright.config.cjs')], {
        cwd: directory, encoding: 'utf8', timeout: 20000,
        env: { ...process.env, FORCE_COLOR: '0', CI: 'true' },
      })
      expect(child.status, child.stdout + child.stderr).toBe(1)
      expect(child.stdout + child.stderr).toContain('LOCAL_FIXTURE_NOT_APPROVED')
      expect(JSON.parse(readFileSync(report, 'utf8'))).toEqual({ afterAllRan: true, requests: [] })
    } finally { rmSync(directory, { recursive: true, force: true }) }
  }, 25000)
})
