import { describe,it,expect } from 'vitest'
import { canManageMeta,connectionInput,selectionInput,metaReturnPath,prepareMetaDisconnect } from './connection-policy'
import type { SalesActor } from '../policy'
const id='00000000-0000-4000-8000-000000000001'
describe('Meta company connection contract',()=>{
 it('uses existing management capability, never a client-supplied role',()=>{
  for(const role of ['SELLER','FINANCE','AUDITOR','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN'] as const){
   expect(canManageMeta({role} as SalesActor)).toBe(['ADMINISTRATOR','SUPERADMIN'].includes(role))
  }
 })
 it('requires explicit company and rejects injected tenant/owner/token fields',()=>{
  expect(connectionInput.safeParse({companyCode:'company-a'}).success).toBe(true)
  expect(connectionInput.safeParse({}).success).toBe(false)
  for(const field of ['organizationId','ownerMemberId','token','returnPath'])
   expect(connectionInput.safeParse({companyCode:'company-a',[field]:'injected'}).success).toBe(false)
 })
 it('rejects duplicate, unbounded and implicit asset selections',()=>{
  const base={state:'a'.repeat(43),assetIds:[id],relationship:'AGENCY_DELEGATED'}
  expect(selectionInput.safeParse(base).success).toBe(true)
  expect(selectionInput.safeParse({...base,assetIds:[id,id]}).success).toBe(false)
  expect(selectionInput.safeParse({...base,assetIds:[]}).success).toBe(false)
  expect(selectionInput.safeParse({...base,companyCode:'foreign'}).success).toBe(false)
 })
 it('preserves organization and encoded company in a fixed local return path',()=>{
  const url=new URL(metaReturnPath(id,'A&B?next=https://evil.invalid'),'https://app.stratixsolutions.us')
  expect(url.pathname).toBe('/sales-native/integrations/meta')
  expect(url.searchParams.get('company')).toBe('A&B?next=https://evil.invalid')
  expect(url.searchParams.get('organization')).toBe(id)
 })
 it('never turns local disablement or provider failure into confirmed revocation',()=>{
  for(const state of ['NOT_REQUESTED','PENDING','FAILED'] as const){
   const plan=prepareMetaDisconnect(['page-a','page-b'],state)
   expect(plan.providerConfirmed).toBe(false)
   expect(plan.manualReviewRequired).toBe(true)
   expect(plan.operations).toHaveLength(2)
   expect(JSON.stringify(plan)).not.toMatch(/access_token|ciphertext/)
  }
  expect(prepareMetaDisconnect([],'CONFIRMED').providerConfirmed).toBe(true)
 })
})
