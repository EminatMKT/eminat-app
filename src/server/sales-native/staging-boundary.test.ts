import {describe,expect,it,vi,afterEach} from 'vitest'
vi.mock('node:fs/promises',()=>({readFile:vi.fn().mockResolvedValue('review:'+ 'x'.repeat(48))}))
import {patientPortalOrigin,isSyntheticRecipient} from './deployment-stage'
import {captureStagingMail} from './staging-mail-capture'
afterEach(()=>vi.unstubAllGlobals())
describe('isolated staging delivery',()=>{
 const env={NEXT_PUBLIC_APP_ENV:'staging',STAGING_MAILPIT_API_BASE_URL:'http://mailpit:8025/',STAGING_MAILPIT_AUTH_FILE:'/run/secrets/mailpit-ui-auth'}
 const message={recipient:'synthetic@example.invalid',subject:'test',html:'<p>test</p>',text:'test'}
 it('pins origins and requires reserved synthetic recipient addresses',()=>{
  expect(patientPortalOrigin(env)).toBe('https://staging.portal.corazonsalud.health')
  expect(patientPortalOrigin({})).toBe('https://portal.corazonsalud.health')
  expect(isSyntheticRecipient('test@example.invalid')).toBe(true)
  expect(isSyntheticRecipient('test@example.invalid.evil.test')).toBe(false)
 })
 it('cannot deliver real recipients, remote capture URLs or production-tier capture',async()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch)
  for(const [m,e] of [[{...message,recipient:'patient@real.test'},env],[message,{...env,STAGING_MAILPIT_API_BASE_URL:'https://mail.example.test/'}],[message,{...env,NEXT_PUBLIC_APP_ENV:'production'}]] as const)expect((await captureStagingMail(m,e)).status).toBe('NOT_CONFIGURED')
  expect(fetch).not.toHaveBeenCalled()
 })
 it('captures privately and returns a namespaced provider receipt',async()=>{
  const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({ID:'capture-123'})});vi.stubGlobal('fetch',fetch)
  expect(await captureStagingMail(message,env)).toEqual({status:'SENT',providerId:'mailpit-capture-123'})
  expect(fetch.mock.calls[0][0]).toBe('http://mailpit:8025/api/v1/send')
  expect(fetch.mock.calls[0][1].redirect).toBe('error')
 })
})
