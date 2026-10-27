import {expect,test} from '@playwright/test'
import en from '../src/shared/i18n/locales/en.json'
import es from '../src/shared/i18n/locales/es.json'
const id='11111111-1111-4111-8111-111111111111',intentId='22222222-2222-4222-8222-222222222222'
for(const locale of ['en','es'] as const)test(`staff Family approval uses the existing membership surface (${locale})`,async({page,context})=>{
 const copy=locale==='en'?en:es,exp=Math.floor(Date.now()/1000)+3600
 const user={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'family-ui@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}
 const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',role:'authenticated',exp})).toString('base64url')}.synthetic-signature`
 const session={access_token:jwt,refresh_token:'synthetic-refresh',expires_at:exp,expires_in:3600,token_type:'bearer',user}
 await context.addCookies([{name:'sb-127-auth-token',value:encodeURIComponent(JSON.stringify(session)),url:'http://localhost:3109'}])
 await page.addInitScript(locale=>{localStorage.setItem('locale',locale);localStorage.setItem('eminat-onboarding-completed','true');localStorage.setItem('eminat-theme',JSON.stringify(locale==='en'?'light':'dark'))},locale)
 const root={id,code:'QA-FAMILY-FIXTURE',display_name:'QA FAMILY FIXTURE',membership_type:'FAMILY',plan:'ESSENTIAL',duration:'MONTHLY',effectiveStatus:'ACTIVE',status:'ACTIVE',expires_at:'2030-12-01',household:[]}
 const members=Array.from({length:2},(_,n)=>({id:`30000000-0000-4000-8000-${String(n+1).padStart(12,'0')}`,firstName:'LOCAL QA',lastName:`Child ${n+1}`,dateOfBirth:'2015-01-01',relationship:'CHILD',reviewStatus:'PENDING',updatedAt:'2026-10-27T01:00:00.000Z',authorityAttested:true}))
 const writes:string[]=[]
 await page.route('**/api/sales-native/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace('/api/sales-native/','')
  if(req.method()==='POST'){
   writes.push(path);expect(path).toBe('patient-family')
   const body=req.postDataJSON();expect(body.intentId).toBe(intentId);expect(req.headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/)
   members.find(member=>member.id===body.memberId)!.reviewStatus=body.decision
   return route.fulfill({json:{data:{coverageActive:false}}})
  }
  if(path==='access')return route.fulfill({json:{allowed:true,role:'SUPERADMIN',organizationId:'9efab353-46a0-43d1-9901-e3f185dc5d30',capabilities:{canWrite:true,canReassign:true,canReadAudit:true,canReadPayments:true}}})
  if(path==='directory')return route.fulfill({json:{data:{users:[],historicalUsers:[],teams:[],stages:[]}}})
  if(path==='memberships')return route.fulfill({json:{data:[root],nextOffset:null}})
  if(path===`memberships/${id}`)return route.fulfill({json:{data:root}})
  if(path==='patient-family')return route.fulfill({json:{data:{intentId,purpose:'FAMILY_ADDITION',status:'PAYMENT_UNAVAILABLE',additionalCount:2,baseCents:0,additionalUnitCents:7499,amountCents:14998,
   approvalReady:members.every(m=>m.reviewStatus==='APPROVED'),locked:false,canReview:true,members},history:[]}})
  return route.fulfill({json:{data:[],nextOffset:null}})
 })
 if(locale==='es')await page.setViewportSize({width:390,height:844})
 await page.goto('/sales-native?section=memberships')
 await page.getByRole('button',{name:/QA FAMILY FIXTURE/}).click()
 const panel=page.getByRole('region',{name:copy['salesNative.familyFamilyPreparationAndApproval']})
 await expect(panel.getByRole('heading',{name:copy['salesNative.familyFamilyPreparationBeforeInvoicing']})).toBeVisible()
 await expect(panel.getByText('$149.98',{exact:false})).toBeVisible()
 const approve=()=>panel.getByRole('button',{name:copy['salesNative.familyApproveDetails'],exact:true}).filter({visible:true})
 await approve().first().click();await expect(approve().first()).toBeDisabled()
 await approve().last().click();await expect(panel.getByRole('status')).toHaveText(copy['salesNative.familyPreparationApprovedForInvoicing'])
 expect(writes).toEqual(['patient-family','patient-family'])
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1)).toBe(false)
 await page.screenshot({path:`/tmp/lilly-family-staff-${locale}.png`,fullPage:false})
})
