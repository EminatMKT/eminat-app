import {describe,expect,it,vi} from 'vitest'
import {nativeSalesEmailPolicy,sendNativeSalesEmail} from './email-delivery'

const qa=nativeSalesEmailPolicy({SALES_NATIVE_EMAIL_MODE:'qa',
  SALES_NATIVE_EMAIL_FROM_EMAIL:'LILLY <noreply@stratixsolutions.us>',
  SALES_NATIVE_EMAIL_QA_RECIPIENTS:'freddy@stratix360.com'})
const message={id:'10000000-0000-4000-8000-000000000001',recipient:'freddy@stratix360.com',
  subject:'Controlled QA',body:'Synthetic test'}

describe('native commercial email gate',()=>{
  it('defaults off and rejects unapproved QA recipients',async()=>{
    expect(nativeSalesEmailPolicy({}).enabled).toBe(false)
    expect(qa.permits('someone@example.test')).toBe(false)
    const send=vi.fn()
    const result=await sendNativeSalesEmail({...message,recipient:'someone@example.test'},
      {policy:qa,provider:{emails:{send}}})
    expect(result.outcome).toBe('FAILED')
    expect(send).not.toHaveBeenCalled()
  })
  it('sends only the allowlisted recipient with a stable provider key',async()=>{
    const send=vi.fn(async()=>({data:{id:'provider-qa'},error:null}))
    const result=await sendNativeSalesEmail(message,{policy:qa,provider:{emails:{send}}})
    expect(result).toEqual({outcome:'SENT',providerId:'provider-qa'})
    expect(send).toHaveBeenCalledWith(expect.objectContaining({to:message.recipient,
      subject:message.subject,text:message.body}),
      {idempotencyKey:`lilly-native-sales-email/${message.id}`})
  })
  it('marks transport ambiguity without claiming delivery',async()=>{
    const send=vi.fn(async():Promise<never>=>{throw new Error('private provider body')})
    const result=await sendNativeSalesEmail(message,{policy:qa,provider:{emails:{send}}})
    expect(result).toEqual({outcome:'UNKNOWN',providerId:null})
  })
  it('requires explicit production approval',()=>{
    const base={SALES_NATIVE_EMAIL_MODE:'production',
      SALES_NATIVE_EMAIL_FROM_EMAIL:'LILLY <noreply@stratixsolutions.us>'}
    expect(nativeSalesEmailPolicy(base).enabled).toBe(false)
    expect(nativeSalesEmailPolicy({...base,SALES_NATIVE_EMAIL_PRODUCTION_APPROVED:'true'}).enabled).toBe(true)
  })
})
