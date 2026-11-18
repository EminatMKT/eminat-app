import {expect,test} from '@playwright/test'
import en from '../src/shared/i18n/locales/en.json'
import es from '../src/shared/i18n/locales/es.json'
const org='f0000000-0000-4000-8000-000000000021',org2='f0000000-0000-4000-8000-000000000022'
const integration='f0000000-0000-4000-8000-000000000301'
const assets=['f0000000-0000-4000-8000-000000000101','f0000000-0000-4000-8000-000000000102']
for(const locale of ['en','es'] as const)test(`Meta connection selection and local disconnect (${locale})`,async({page,context})=>{
 const copy=locale==='en'?en:es,exp=Math.floor(Date.now()/1000)+3600
 const user={id:'f0000000-0000-4000-8000-000000000001',email:'meta-ui@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}
 const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',role:'authenticated',exp})).toString('base64url')}.synthetic-signature`
 await context.addCookies([{name:'sb-127-auth-token',value:encodeURIComponent(JSON.stringify({access_token:jwt,refresh_token:'synthetic-refresh',expires_at:exp,expires_in:3600,token_type:'bearer',user})),url:'http://localhost:3110'}])
 await page.addInitScript(locale=>{localStorage.setItem('locale',locale);localStorage.setItem('eminat-onboarding-completed','true')},locale)
 const writes:string[]=[];let connected=false,disabled=false
 const snapshot=()=>({companies:[{code:'COMPANY_A',name:'Synthetic Company A'},{code:'COMPANY_B',name:'Synthetic Company B'}],
  canManage:true,metaAvailable:true,integrations:connected?[{id:integration,company_code:'COMPANY_A',status:disabled?'REVOKED':'CONNECTED',
   granted_permissions:['pages_show_list'],provider_cleanup:disabled?'PENDING':'NOT_REQUESTED',provider_cleanup_error:null,
   grant:{authorizer_member_id:'Synthetic authorizer',status:disabled?'LOCAL_DISABLED':'ACTIVE',expires_at:'2030-01-01T00:00:00Z',authorized_at:'2026-10-31T00:00:00Z',app_id:'synthetic-app',checked_at:null,health_error:null}}]:[],
  assets:connected?assets.map((id,i)=>({id,integrationId:integration,company_code:'COMPANY_A',external_asset_id:`synthetic-page-${i}`,asset_type:'page',display_name:`Synthetic Page ${i+1}`,status:disabled?'DISABLED':'READY',webhook_status:'INGESTION_DISABLED',reported_business_id:null,relationship:'AGENCY_DELEGATED'})):[]})
 await page.route('**/api/sales-native/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname.replace('/api/sales-native/','')
  if(request.method()==='POST'){
   writes.push(path)
   if(path==='social/meta/complete'){
    expect(request.headers()['x-sales-organization-id']).toBe(org)
    expect(request.postDataJSON()).toEqual({state:'a'.repeat(43),assetIds:assets,relationship:'AGENCY_DELEGATED'})
    connected=true;return route.fulfill({json:{data:{integrationId:integration,assetCount:2,ingestionEnabled:false}}})
   }
   if(path==='social/meta/revoke'){
    expect(request.postDataJSON()).toEqual({integrationId:integration});disabled=true
    return route.fulfill({json:{data:{localDisabled:true,providerConfirmed:false}}})
   }
   throw new Error(`Unexpected Phase 1 mutation: ${path}`)
  }
  if(path==='access')return route.fulfill({json:{allowed:true,role:'ADMINISTRATOR',capabilities:{}}})
  if(path==='social/connections')return route.fulfill({json:{data:snapshot()}})
  if(path==='social/meta/pages')return route.fulfill({json:{data:{companyCode:'COMPANY_A',assets:assets.map((id,i)=>({id,external_id:`synthetic-page-${i}`,asset_type:'page',display_name:`Synthetic Page ${i+1}`,reported_business_id:null,tasks:['MANAGE']}))}}})
  return route.fulfill({json:{data:[]}})
 })
 // Never permit browser traffic to a live provider during these tests.
 await page.route('https://www.facebook.com/**',()=>{throw new Error('LIVE_META_FORBIDDEN')})
 if(locale==='es')await page.setViewportSize({width:390,height:844})
 await page.goto(`/sales-native/integrations/meta?organization=${org}&company=COMPANY_A&metaState=${'a'.repeat(43)}`)
 await expect(page.getByRole('heading',{name:copy['meta.connectionsTitle']})).toBeVisible()
 const organization=page.locator('select[name="organization"]')
 await expect(organization.locator('option')).toHaveCount(3)
 await expect(organization).toHaveValue(org)
 await expect(page.getByRole('combobox',{name:copy['meta.company'],exact:true})).toHaveValue('COMPANY_A')
 await page.getByRole('checkbox',{name:/Synthetic Page 1/}).check()
 await page.getByRole('checkbox',{name:/Synthetic Page 2/}).check()
 await page.getByRole('combobox',{name:copy['meta.relationship']}).selectOption('AGENCY_DELEGATED')
 await page.getByRole('button',{name:copy['meta.saveAssets']}).click()
 await expect(page.getByText(copy['meta.notChecked'],{exact:false})).toBeVisible()
 await expect(page).not.toHaveURL(/metaState/)
 page.once('dialog',dialog=>dialog.accept())
 await page.getByRole('button',{name:copy['meta.localDisconnect']}).click()
 await expect(page.getByText(copy['meta.cleanupRequired'])).toBeVisible()
 expect(writes).toEqual(['social/meta/complete','social/meta/revoke'])
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1)).toBe(false)
 await page.screenshot({path:`/tmp/lilly-meta-phase1-${locale}.png`,fullPage:true})
 await organization.selectOption(org2)
 await page.getByRole('button',{name:copy['meta.openWorkspace']}).click()
 await expect(organization).toHaveValue(org2)
 await expect(page.getByRole('combobox',{name:copy['meta.company'],exact:true})).toHaveValue('')
 expect(writes).toHaveLength(2)
})
