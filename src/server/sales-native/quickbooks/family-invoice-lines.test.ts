import {describe,it,expect} from 'vitest'
import {quoteExpandedFamily,quoteFamilyProration} from '../family-pricing'
import {familyInvoiceLines,familyInvoiceItemsMatch,type FamilyInvoiceSnapshot} from './family-invoice-lines'
const initial=(count:number,renewal=false):FamilyInvoiceSnapshot=>{
  const q=quoteExpandedFamily('ESSENTIAL','MONTHLY',count,renewal)
  return {plan:'ESSENTIAL',duration:'MONTHLY',membership_type:'FAMILY',purpose:renewal?'RENEWAL':'ENROLLMENT',amount_cents:q.totalCents,
    additional_member_count:count,family_policy_version:'FAMILY_EXPANSION_V1',family_base_amount_cents:q.baseCents,family_additional_unit_cents:q.additionalUnitCents,
    family_pricing_snapshot:{version:'FAMILY_EXPANSION_V1',count,perMemberCents:q.additionalUnitCents,totalCents:q.totalCents,months:q.initialMonths}}
}
describe('immutable Family invoice lines',()=>{
  for(const count of [0,1,2,3,5,9])for(const renewal of [false,true])it(`exact total ${count}; renewal ${renewal}`,()=>{
    const snapshot=initial(count,renewal),lines=familyInvoiceLines(snapshot)
    if(!count)return expect(lines).toBeUndefined()
    expect(lines).toHaveLength(2)
    expect(lines!.reduce((sum,line)=>sum+line.quantity*line.unitCents,0)).toBe(snapshot.amount_cents)
    expect(lines![1].unitCents).toBe(4999*(renewal?1:2))
    expect(lines![1].quantity).toBe(count)
  })
  it('uses a separate prorated additional-only line',()=>{
    const quote=quoteFamilyProration('ESSENTIAL',2,'2026-02-15','2026-04-01',[{startsAt:'2026-01-01',expiresAt:'2026-04-01'}])
    const lines=familyInvoiceLines({...initial(2),purpose:'FAMILY_ADDITION',family_base_amount_cents:0,family_additional_unit_cents:quote.perMemberCents,
      amount_cents:quote.totalCents,family_pricing_snapshot:quote})!
    expect(lines).toHaveLength(1);expect(lines[0].quantity).toBe(2);expect(lines[0].unitCents).toBe(7499)
  })
  it('preserves legacy invoices',()=>expect(familyInvoiceLines({plan:'ESSENTIAL',duration:'MONTHLY',membership_type:'FAMILY',amount_cents:19996})).toBeUndefined())
  it.each([{additional_member_count:10},{family_base_amount_cents:1},{family_additional_unit_cents:4999},{amount_cents:1},{family_policy_version:'unknown'},
    {family_pricing_snapshot:null},{membership_type:'INDIVIDUAL'},{purpose:'OTHER'}])('rejects a corrupted snapshot %j',patch=>{
    expect(()=>familyInvoiceLines({...initial(2),...patch})).toThrow('FAMILY_INVOICE_SNAPSHOT_INVALID')
  })
  it('matches exact provider quantity, unit, item and amount, allowing order changes',()=>{
    const expected=familyInvoiceLines(initial(2))!
    const provider=expected.map(line=>({Amount:line.quantity*line.unitCents/100,DetailType:'SalesItemLineDetail',
      SalesItemLineDetail:{ItemRef:{value:'301'},Qty:line.quantity,UnitPrice:line.unitCents/100}})).reverse()
    expect(familyInvoiceItemsMatch(provider,'301',expected)).toBe(true)
    expect(familyInvoiceItemsMatch(provider,'302',expected)).toBe(false)
    expect(familyInvoiceItemsMatch(provider.slice(1),'301',expected)).toBe(false)
    expect(familyInvoiceItemsMatch([...provider,provider[0]],'301',expected)).toBe(false)
    expect(familyInvoiceItemsMatch(provider.map(line=>({...line,SalesItemLineDetail:{...line.SalesItemLineDetail,Qty:1}})),'301',expected)).toBe(false)
    expect(familyInvoiceItemsMatch(provider.map(line=>({...line,SalesItemLineDetail:{...line.SalesItemLineDetail,UnitPrice:1}})),'301',expected)).toBe(false)
    expect(familyInvoiceItemsMatch([...provider,{Amount:0,DetailType:'DiscountLineDetail'}],'301',expected)).toBe(false)
  })
})

describe('provider payment evidence for Family lines',()=>{
 it('requires full matching payment and remains pending on a partial payment',async()=>{
  const {decideQboPayment}=await import('./reconciliation')
  const snapshot=initial(2),familyLines=familyInvoiceLines(snapshot)!,amount=snapshot.amount_cents/100
  const invoice={Id:'1133',DocNumber:'1133',CustomerRef:{value:'321'},TotalAmt:amount,Balance:0,
    Line:familyLines.map(line=>({Amount:line.quantity*line.unitCents/100,DetailType:'SalesItemLineDetail',SalesItemLineDetail:{ItemRef:{value:'7'},Qty:line.quantity,UnitPrice:line.unitCents/100}})),
    LinkedTxn:[{TxnId:'900',TxnType:'Payment'}]}
  const payment={Id:'900',CustomerRef:{value:'321'},TotalAmt:amount,TxnDate:'2026-10-27',Line:[{Amount:amount,LinkedTxn:[{TxnId:'1133',TxnType:'Invoice'}]}]}
  const input={invoice,payments:[payment],invoiceId:'1133',invoiceNumber:'1133',customerId:'321',itemId:'7',amountCents:snapshot.amount_cents,alreadyActive:false,familyLines}
  expect(decideQboPayment(input).status).toBe('PAID')
  expect(decideQboPayment({...input,invoice:{...invoice,Balance:1}}).status).toBe('PENDING')
  expect(decideQboPayment({...input,invoice:{...invoice,TxnTaxDetail:{TotalTax:1}}}).status).toBe('REVIEW')
  expect(decideQboPayment({...input,invoice:{...invoice,Line:invoice.Line.slice(1)}}).status).toBe('REVIEW')
  expect(decideQboPayment({...input,payments:[{...payment,Line:[{Amount:amount-1,LinkedTxn:[{TxnId:'1133',TxnType:'Invoice'}]}]}]}).status).toBe('RETRY')
  expect(decideQboPayment({...input,alreadyActive:true})).toMatchObject({status:'REVIEW',reason:'ALREADY_ACTIVE'})
 })
 it('sends the exact two-line quote through the existing provider client',async()=>{
  const {QboClient,QBO_CALLBACK}=await import('./client')
  const snapshot=initial(2),familyLines=familyInvoiceLines(snapshot)!
  let posted:Record<string,unknown>|undefined
  const client=new QboClient({clientId:'synthetic-family-client',clientSecret:'synthetic-family-secret',redirectUri:QBO_CALLBACK},(async(_url,init)=>{
   posted=JSON.parse(String(init?.body)) as Record<string,unknown>
   return Response.json({Invoice:{Id:'100',DocNumber:'100',CustomerRef:{value:'321'},TotalAmt:snapshot.amount_cents/100,Balance:snapshot.amount_cents/100,Line:posted.Line}})
  }) as typeof fetch)
  const result=await client.createInvoice('123','synthetic-token',{customerId:'321',itemId:'7',email:'synthetic@example.invalid',amountCents:snapshot.amount_cents,intentId:'12345678-1234-4234-8234-123456789012',familyLines})
  expect(result.Line?.map(line=>[line.SalesItemLineDetail?.Qty,line.SalesItemLineDetail?.UnitPrice,line.Amount])).toEqual([[1,199.98,199.98],[2,99.98,199.96]])
  expect(result.TotalAmt).toBe(399.94)
  expect(posted?.AllowOnlineCreditCardPayment).toBe(true)
  expect(posted?.AllowOnlineACHPayment).toBe(true)
 })
})
