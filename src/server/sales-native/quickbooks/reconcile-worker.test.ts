import { beforeEach,describe,expect,it,vi } from 'vitest'

const state = vi.hoisted(() => ({
  event: { id:'event',organization_id:'emc',environment:'production',realm_id:'123',
    entity_type:'Invoice',entity_id:'1133',operation:'Update',attempts:0 },
  mapping: { id:'mapping',organization_id:'emc',enrollment_intent_id:'intent',
    opportunity_id:'opportunity',sales_payment_id:null as string | null,
    base_invoice_amount_cents:19998,qa_synthetic:false,qbo_invoice_number:'1133',
    qbo_invoice_reference:'1133',qbo_customer_reference:'321',qbo_item_reference:'7',
    qbo_invoice_status:'OPEN',
    qbo_payment_status:'UNPAID',finance_verification_status:'PENDING',
    verification_state:'PAYMENT_PENDING',membership_activation_status:'NOT_ACTIVE' },
  intent: { id:'intent',organization_id:'emc',patient_identity_id:'identity',
    opportunity_id:'opportunity',amount_cents:19998,membership_id:null as string | null,
    plan:'ESSENTIAL',membership_type:'FAMILY',duration:'MONTHLY' },
  opportunity: { id:'opportunity',organization_id:'emc',primary_contact_id:'contact',
    amount:199.98,currency:'USD' },
  identity: { id:'identity',organization_id:'emc',contact_id:'contact' },
  contact: { id:'contact',first_name:'QA',last_name:'Family',email:'qa@example.invalid',
    phone:'555-0100',address:{ street:'QA Street',city:'Miami',state:'FL',
      postalCode:'33101',country:'US' },do_not_email:false },
  invoice: { Id:'1133',DocNumber:'1133',CustomerRef:{ value:'321' },
    TotalAmt:199.98,Balance:0,CurrencyRef:{ value:'USD' },
    Line:[{ Amount:199.98,DetailType:'SalesItemLineDetail',
      SalesItemLineDetail:{ ItemRef:{ value:'7' },Qty:1 } }],
    LinkedTxn:[{ TxnId:'900',TxnType:'Payment' }] },
  payment: { Id:'900',CustomerRef:{ value:'321' },TotalAmt:199.98,
    TxnDate:'2026-10-22',Line:[{ Amount:199.98,
      LinkedTxn:[{ TxnId:'1133',TxnType:'Invoice' }] }] },
  hasMapping:true,claimable:true,history:[] as string[],rpcCalls:[] as string[],
  finalStatus:'',invoiceReads:0,paymentReads:0,
}))

vi.mock('server-only',() => ({}))
vi.mock('@/server/sales-native/patient-email-delivery',() => ({
  sendPatientActivation:vi.fn(async () => ({ status:'queued' })),
}))
vi.mock('./connection',() => ({
  EMC_ORGANIZATION_ID:'emc',connectedQboReadAccess:vi.fn(async () => ({
    realmId:'123',accessToken:'synthetic-access',client:{
      invoice:vi.fn(async () => { state.invoiceReads++; return state.invoice }),
      payment:vi.fn(async () => { state.paymentReads++; return state.payment }),
    },
  })),
}))
vi.mock('@/shared/db/supabaseAdmin',() => ({ supabaseAdmin:() => ({
  rpc:async (name:string) => {
    state.rpcCalls.push(name)
    if (name === 'native_sales_patient_qbo_update') {
      state.mapping.verification_state='PAYMENT_VERIFIED'
      state.mapping.sales_payment_id='payment-row'
      state.mapping.finance_verification_status='VERIFIED'
      state.mapping.qbo_payment_status='VERIFIED'
    }
    if (name === 'native_sales_issue_membership') state.intent.membership_id='membership'
    return { data:true,error:null }
  },
  from:(table:string) => {
    let operation = 'select'
    let payload: Record<string,unknown> = {}
    const query = {
      select:(_columns:string) => query,
      eq:(_key:string,_value:unknown) => query,
      is:(_key:string,_value:unknown) => query,
      in:(_key:string,_value:unknown) => query,
      lte:(_key:string,_value:unknown) => query,
      order:(_key:string,_options:unknown) => query,
      update:(value:Record<string,unknown>) => {
        operation='update';payload=value;return query
      },
      insert:async (value:Record<string,unknown>) => {
        if (table === 'sales_history') state.history.push(String(value.action))
        return { error:null }
      },
      limit:async (_count:number) => ({ data:table === 'sales_qbo_webhook_events'
        ? [state.event] : state.hasMapping ? [state.mapping] : [],error:null }),
      maybeSingle:async () => {
        if (table === 'sales_qbo_webhook_events') return { data:state.claimable
          ? { id:'event' } : null,error:null }
        const rows:Record<string,unknown> = {
          sales_patient_enrollment_intents:state.intent,
          sales_patient_qbo_manual:state.mapping,
          sales_opportunities:state.opportunity,
          sales_patient_identities:state.identity,
          sales_contacts:state.contact,
          sales_payments:{ reference:'QBO-1133-bdc5d8a48c23897906b09a9a3680bd2e' },
        }
        return { data:rows[table] ?? null,error:null }
      },
      then:(resolve:(value:unknown) => unknown) => {
        if (table === 'sales_qbo_webhook_events' && operation === 'update')
          state.finalStatus=String(payload.status)
        return Promise.resolve({ error:null }).then(resolve)
      },
    }
    return query
  },
}) }))

import { reconcileQboEvents } from './reconcile-worker'

beforeEach(() => {
  state.event.entity_type='Invoice';state.event.realm_id='123';state.event.operation='Update'
  state.mapping.verification_state='PAYMENT_PENDING';state.mapping.sales_payment_id=null
  state.mapping.finance_verification_status='PENDING';state.mapping.qbo_payment_status='UNPAID'
  state.intent.membership_id=null;state.identity.contact_id='contact'
  state.hasMapping=true;state.claimable=true;state.history=[];state.rpcCalls=[]
  state.finalStatus='';state.invoiceReads=0;state.paymentReads=0
})

describe('read-only QBO event processing boundary',() => {
  it('uses provider-read Invoice and Payment evidence before one verification and activation',async () => {
    const result = await reconcileQboEvents()
    expect(result.processed,JSON.stringify({ history:state.history,rpcCalls:state.rpcCalls })).toBe(1)
    expect(state.rpcCalls).toEqual(['native_sales_patient_qbo_update',
      'native_sales_issue_membership'])
    expect(state.history).toContain('qbo_provider_payment_verified')
    expect(state.history).toContain('qbo_automatic_membership_activated')
  })
  it('routes a Payment event through its linked invoice',async () => {
    state.event.entity_type='Payment';state.event.entity_id='900'
    expect((await reconcileQboEvents()).processed).toBe(1)
    expect(state.invoiceReads).toBeGreaterThan(0)
    expect(state.rpcCalls).toContain('native_sales_patient_qbo_update')
  })
  it('does not verify an unknown invoice',async () => {
    state.hasMapping=false
    expect((await reconcileQboEvents()).retry).toBe(1)
    expect(state.rpcCalls).toEqual([])
    expect(state.history).toContain('qbo_invoice_unmatched')
  })
  it('does not verify a patient mismatch or wrong realm',async () => {
    state.identity.contact_id='another-contact'
    expect((await reconcileQboEvents()).ignored).toBe(1)
    expect(state.rpcCalls).toEqual([])
    state.identity.contact_id='contact';state.history=[]
    state.event.realm_id='999'
    expect((await reconcileQboEvents()).ignored).toBe(1)
    expect(state.history).toContain('qbo_realm_mismatch')
  })
  it('does not verify a mismatched organization or canonical item',async () => {
    state.mapping.organization_id='other-org'
    expect((await reconcileQboEvents()).ignored).toBe(1)
    expect(state.rpcCalls).toEqual([])
    state.mapping.organization_id='emc';state.history=[]
    state.mapping.qbo_item_reference='99'
    expect((await reconcileQboEvents()).processed).toBe(1)
    expect(state.rpcCalls).toEqual([])
    expect(state.history).toContain('qbo_review')
    state.mapping.qbo_item_reference='7'
  })
  it('does not process an event another worker already claimed',async () => {
    state.claimable=false
    expect(await reconcileQboEvents()).toEqual({ processed:0,retry:0,ignored:0 })
    expect(state.rpcCalls).toEqual([])
  })
  it('does not create a second Sales payment when provider proof was already recorded',async () => {
    state.mapping.verification_state='PAYMENT_VERIFIED'
    state.mapping.sales_payment_id='payment-row'
    state.mapping.finance_verification_status='VERIFIED'
    state.mapping.qbo_payment_status='VERIFIED'
    expect((await reconcileQboEvents()).processed).toBe(1)
    expect(state.rpcCalls).toEqual(['native_sales_issue_membership'])
  })
  it('never issues a second membership for an already active patient',async () => {
    state.intent.membership_id='membership'
    expect((await reconcileQboEvents()).processed).toBe(1)
    expect(state.rpcCalls).toEqual([])
    expect(state.history).toContain('qbo_review')
  })
})
