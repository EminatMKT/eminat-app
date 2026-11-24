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
    plan:'ESSENTIAL',membership_type:'FAMILY',duration:'MONTHLY',purpose:'ENROLLMENT',
    status:'PAYMENT_PENDING',renewal_expires_at:null as string|null },
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
  issuedAt:'',emailStatus:'QUEUED',emailCalls:0,reviewCalls:[] as Record<string,unknown>[],
  reviewRecorded:false,reviewFailure:false,reviewClaimLost:false,reverseOnLatest:false,pollStatuses:[] as string[],
}))

vi.mock('server-only',() => ({}))
vi.mock('@/server/sales-native/patient-email-delivery',() => ({
  sendPatientRenewal:vi.fn(async () => { state.emailCalls++;return {status:state.emailStatus} }),
  sendPatientActivation:vi.fn(async () => {
    state.emailCalls++
    return { status:state.emailStatus }
  }),
}))
vi.mock('./connection',() => ({
  EMC_ORGANIZATION_ID:'emc',connectedQboReadAccess:vi.fn(async () => ({
    realmId:'123',accessToken:'synthetic-access',client:{
      invoice:vi.fn(async () => { state.invoiceReads++; return state.reverseOnLatest && state.invoiceReads>1 ? {...state.invoice,Balance:99.98} : state.invoice }),
      payment:vi.fn(async () => { state.paymentReads++; return state.payment }),
    },
  })),
}))
vi.mock('@/shared/db/supabaseAdmin',() => ({ supabaseAdmin:() => ({
  rpc:async (name:string,args?:Record<string,unknown>) => {
    state.rpcCalls.push(name)
    if(name==='native_sales_qbo_require_review'){
      state.reviewCalls.push(args??{})
      if(state.reviewFailure)return {data:null,error:{message:'audit write failed'}}
      if(state.reviewClaimLost)return {data:false,error:null}
      state.finalStatus='MANUAL_REVIEW'
      if(!state.reviewRecorded)state.history.push('qbo_manual_review_required')
      state.reviewRecorded=true
    }
    if (name === 'native_sales_patient_qbo_update') {
      state.mapping.verification_state='PAYMENT_VERIFIED'
      state.mapping.sales_payment_id='payment-row'
      state.mapping.finance_verification_status='VERIFIED'
      state.mapping.qbo_payment_status='VERIFIED'
    }
    if (name === 'native_sales_patient_complete_renewal') {
      state.intent.membership_id='membership';state.intent.status='FULFILLED'
      state.intent.renewal_expires_at='2026-12-22'
    }
    if (name === 'native_sales_issue_membership') {
      state.issuedAt=String(args?.p_issued_at)
      state.intent.membership_id='membership'
    }
    return { data:true,error:null }
  },
  from:(table:string) => {
    let operation = 'select'
    let payload: Record<string,unknown> = {}
    const query = {
      select:(_columns:string) => query,
      eq:(_key:string,_value:unknown) => query,
      is:(_key:string,_value:unknown) => query,
      in:(key:string,value:unknown) => {if(table==='sales_qbo_webhook_events'&&key==='status')state.pollStatuses=value as string[];return query},
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
          sales_payments:{ reference:'QBO-1133-bdc5d8a48c23897906b09a9a3680bd2e',
            paid_at:'2026-10-22' },
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
  state.event.entity_type='Invoice';state.event.entity_id='1133';state.event.realm_id='123';state.event.operation='Update';state.event.attempts=0
  state.mapping.verification_state='PAYMENT_PENDING';state.mapping.sales_payment_id=null
  state.mapping.finance_verification_status='PENDING';state.mapping.qbo_payment_status='UNPAID'
  state.intent.purpose='ENROLLMENT';state.intent.status='PAYMENT_PENDING';state.intent.renewal_expires_at=null
  state.intent.membership_id=null;state.identity.contact_id='contact'
  state.hasMapping=true;state.claimable=true;state.history=[];state.rpcCalls=[]
  state.finalStatus='';state.invoiceReads=0;state.paymentReads=0
  state.issuedAt='';state.emailStatus='QUEUED';state.emailCalls=0
  state.contact.do_not_email=false
  state.mapping.membership_activation_status='NOT_ACTIVE';state.mapping.qbo_item_reference='7'
  state.reviewCalls=[];state.reviewRecorded=false;state.reviewFailure=false;state.reviewClaimLost=false;state.reverseOnLatest=false;state.pollStatuses=[]
  state.invoice.Balance=0;state.invoice.LinkedTxn=[{TxnId:'900',TxnType:'Payment'}]
  state.payment.TotalAmt=199.98;state.payment.Line=[{Amount:199.98,LinkedTxn:[{TxnId:'1133',TxnType:'Invoice'}]}]

})

describe('read-only QBO event processing boundary',() => {
  it('extends a renewal only after provider proof, and replay never issues another membership',async () => {
    state.intent.purpose='RENEWAL'
    expect((await reconcileQboEvents()).processed).toBe(1)
    expect(state.invoiceReads).toBe(2)
    expect(state.rpcCalls).toEqual(['native_sales_patient_qbo_update','native_sales_patient_complete_renewal'])
    state.rpcCalls=[]
    expect((await reconcileQboEvents()).processed).toBe(1)
    expect(state.rpcCalls).toEqual([])
    expect(state.emailCalls).toBe(2) // same durable renewal event is replayed by the outbox
  })
  it('never extends an unpaid renewal',async () => {
    state.intent.purpose='RENEWAL';state.invoice.Balance=199.98
    try {
      expect((await reconcileQboEvents()).retry).toBe(1)
      expect(state.rpcCalls).toEqual([])
    } finally {state.invoice.Balance=0}
  })
  it('keeps a paid opted-out renewal active while suppressing its confirmation email',async () => {
    state.intent.purpose='RENEWAL';state.contact.do_not_email=true
    expect((await reconcileQboEvents()).processed).toBe(1)
    expect(state.rpcCalls).toContain('native_sales_patient_complete_renewal')
    expect(state.rpcCalls).not.toContain('native_sales_issue_membership')
    expect(state.emailCalls).toBe(0)
  })
  it('activates an opted-out patient once and suppresses email on initial processing and replay',async () => {
    state.contact.do_not_email=true
    expect((await reconcileQboEvents()).processed).toBe(1)
    expect(state.rpcCalls).toContain('native_sales_issue_membership')
    expect(state.history).toContain('qbo_automatic_membership_activated')
    expect(state.emailCalls).toBe(0)
    state.rpcCalls=[]
    state.mapping.membership_activation_status='ACTIVE'
    expect((await reconcileQboEvents()).processed).toBe(1)
    expect(state.rpcCalls).not.toContain('native_sales_issue_membership')
    expect(state.emailCalls).toBe(0)
    state.mapping.membership_activation_status='NOT_ACTIVE'
  })
  it('uses provider-read Invoice and Payment evidence before one verification and activation',async () => {
    const result = await reconcileQboEvents()
    expect(result.processed,JSON.stringify({ history:state.history,rpcCalls:state.rpcCalls })).toBe(1)
    expect(state.rpcCalls).toEqual(['native_sales_patient_qbo_update',
      'native_sales_issue_membership'])
    expect(state.history).toContain('qbo_provider_payment_verified')
    expect(state.history).toContain('qbo_automatic_membership_activated')
    expect(state.issuedAt).toBe('2026-10-22')
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
    expect((await reconcileQboEvents()).manualReview).toBe(1)
    expect(state.rpcCalls).toEqual(['native_sales_qbo_require_review'])
    expect(state.history).toContain('qbo_manual_review_required')
    state.mapping.qbo_item_reference='7'
  })
  it('does not process an event another worker already claimed',async () => {
    state.claimable=false
    expect(await reconcileQboEvents()).toEqual({ processed:0,retry:0,ignored:0,manualReview:0 })
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
    expect(state.history).toContain('qbo_already_active')
    expect(state.emailCalls).toBe(1)
  })
  it('retries activation email after a committed membership without issuing it again',async () => {
    state.emailStatus='FAILED'
    expect((await reconcileQboEvents()).retry).toBe(1)
    expect(state.rpcCalls).toContain('native_sales_issue_membership')
    state.rpcCalls=[]
    state.emailStatus='SENT'
    expect((await reconcileQboEvents()).processed).toBe(1)
    expect(state.rpcCalls).toEqual([])
    expect(state.emailCalls).toBe(2)
    expect(state.history).toContain('qbo_already_active')
  })
})


describe('terminal payment review without financial mutations',()=>{
  function unlinkedVoid(attempts:number){
    state.event.entity_type='Payment';state.event.entity_id='900';state.event.operation='Void';state.event.attempts=attempts
    state.payment.TotalAmt=0;state.payment.Line=[]
  }
  it.each([0,1])('retries a provider-read unlinked void before exhaustion (%s prior attempts)',async attempts=>{
    unlinkedVoid(attempts)
    expect(await reconcileQboEvents()).toMatchObject({retry:1,manualReview:0})
    expect(state.paymentReads).toBe(1);expect(state.invoiceReads).toBe(0)
    expect(state.rpcCalls).toEqual([]);expect(state.emailCalls).toBe(0)
    expect(state.history).toContain('qbo_payment_ambiguous')
  })
  it.each([2,11,25])('terminally reviews an exhausted unlinked void (%s prior attempts)',async attempts=>{
    unlinkedVoid(attempts)
    expect(await reconcileQboEvents()).toMatchObject({retry:0,manualReview:1})
    expect(state.finalStatus).toBe('MANUAL_REVIEW')
    expect(state.rpcCalls).toEqual(['native_sales_qbo_require_review'])
    expect(state.reviewCalls[0]).toMatchObject({p_event_id:'event',p_organization_id:'emc',p_environment:'production',p_expected_attempts:attempts+1,p_reason:'UNLINKED_VOIDED_PAYMENT',p_evidence:{paymentId:'900',customerId:'321',paymentTotalCents:0,invoiceIds:[]}})
    expect(state.emailCalls).toBe(0);expect(state.intent.membership_id).toBeNull()
    expect(state.pollStatuses).toEqual(['PENDING','RETRY'])
  })
  it('preserves prior membership and payment evidence for post-activation reversal review',async()=>{
    state.intent.membership_id='existing-membership';state.mapping.sales_payment_id='existing-payment'
    state.mapping.membership_activation_status='ACTIVE';state.invoice.Balance=99.98
    expect((await reconcileQboEvents()).manualReview).toBe(1)
    expect(state.reviewCalls[0]).toMatchObject({p_reason:'INVOICE_EVIDENCE_REQUIRES_REVIEW',p_evidence:{membershipId:'existing-membership',invoiceId:'1133',decisionReason:'ACTIVE_INVOICE_REVERSED_OR_PARTIAL',invoiceBalanceCents:9998}})
    expect(state.rpcCalls).toEqual(['native_sales_qbo_require_review'])
    expect(state.intent.membership_id).toBe('existing-membership');expect(state.mapping.sales_payment_id).toBe('existing-payment');expect(state.emailCalls).toBe(0)
  })
  it('holds a reversal between verification and activation while preserving the recorded evidence',async()=>{
    state.reverseOnLatest=true
    expect((await reconcileQboEvents()).manualReview).toBe(1)
    expect(state.rpcCalls).toEqual(['native_sales_patient_qbo_update','native_sales_qbo_require_review'])
    expect(state.reviewCalls[0]).toMatchObject({p_reason:'PAYMENT_CHANGED_BEFORE_ACTIVATION'})
    expect(state.mapping.sales_payment_id).toBe('payment-row');expect(state.intent.membership_id).toBeNull();expect(state.emailCalls).toBe(0)
  })
  it('requires terminal review when zero-balance invoice payment links never become authoritative',async()=>{
    state.event.attempts=11;state.invoice.LinkedTxn=[]
    expect((await reconcileQboEvents()).manualReview).toBe(1)
    expect(state.reviewCalls[0]).toMatchObject({p_reason:'PAYMENT_LINKS_UNRESOLVED'})
    expect(state.rpcCalls).toEqual(['native_sales_qbo_require_review'])
  })
  it('does not trust a stale Void hint over current linked provider payment evidence',async()=>{
    state.event.entity_type='Payment';state.event.entity_id='900';state.event.operation='Void'
    expect((await reconcileQboEvents()).processed).toBe(1)
    expect(state.paymentReads).toBeGreaterThan(0);expect(state.reviewCalls).toEqual([])
  })
  it('routes multiple invoice links to review without guessing a beneficiary',async()=>{
    state.event.entity_type='Payment';state.event.entity_id='900'
    state.payment.Line=[{Amount:199.98,LinkedTxn:[{TxnId:'1133',TxnType:'Invoice'},{TxnId:'999',TxnType:'Invoice'}]}]
    expect((await reconcileQboEvents()).manualReview).toBe(1)
    expect(state.invoiceReads).toBe(0);expect(state.reviewCalls[0]).toMatchObject({p_reason:'AMBIGUOUS_PAYMENT_INVOICES'})
    expect(state.intent.membership_id).toBeNull()
  })
  it('retains deletion evidence for review without attempting activation',async()=>{
    state.event.operation='Delete'
    expect((await reconcileQboEvents()).manualReview).toBe(1)
    expect(state.reviewCalls[0]).toMatchObject({p_reason:'PROVIDER_ENTITY_DELETED'})
    expect(state.invoiceReads).toBe(0);expect(state.paymentReads).toBe(0)
    expect(state.intent.membership_id).toBeNull()
  })
  it('fails closed if the atomic terminal audit cannot be saved',async()=>{
    unlinkedVoid(2);state.reviewFailure=true
    await expect(reconcileQboEvents()).rejects.toThrow('QBO_MANUAL_REVIEW_UNAVAILABLE')
    expect(state.history).not.toContain('qbo_manual_review_required');expect(state.intent.membership_id).toBeNull();expect(state.emailCalls).toBe(0)
  })
  it('does not finalize a newer worker claim',async()=>{
    unlinkedVoid(2);state.reviewClaimLost=true
    expect(await reconcileQboEvents()).toMatchObject({manualReview:0,processed:0})
    expect(state.finalStatus).not.toBe('MANUAL_REVIEW');expect(state.intent.membership_id).toBeNull()
  })
})
