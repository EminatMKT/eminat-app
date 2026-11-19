import {describe,expect,it} from 'vitest'
import {metaAdministrationOrganizations,metaSettingsHref} from './meta-navigation'
describe('central Meta navigation context',()=>{
 it('offers only existing organization administrators without combining roles',()=>{
  expect(metaAdministrationOrganizations([
   {organizationId:'a',name:'A',role:'SELLER'},
   {organizationId:'b',name:'B',role:'ADMINISTRATOR'},
   {organizationId:'c',name:'C',role:'SUPERADMIN'},
   {organizationId:'d',name:'D',role:'admin'},
   {organizationId:'e',name:'E'},
  ]).map(org=>org.organizationId)).toEqual(['b','c'])
 })
 it('preserves explicit organization and company without accepting a redirect',()=>{
  const href=metaSettingsHref('org &other=tenant','https://evil.invalid/#company')
  const url=new URL(href,'https://lilly.invalid')
  expect(url.origin).toBe('https://lilly.invalid')
  expect(url.pathname).toBe('/settings/integrations/meta')
  expect(Array.from(url.searchParams.entries())).toEqual([['organization','org &other=tenant'],['company','https://evil.invalid/#company']])
 })
 it('does not assign a company without an organization',()=>{
  expect(metaSettingsHref(undefined,'COMPANY')).toBe('/settings/integrations/meta')
 })
 it('carries context across central settings steps',()=>{
  expect(metaSettingsHref('org','COMPANY','/settings/integrations')).toBe('/settings/integrations?organization=org&company=COMPANY')
 })
})
