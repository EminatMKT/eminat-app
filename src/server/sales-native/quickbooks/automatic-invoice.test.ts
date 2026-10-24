import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ claim:vi.fn(), from:vi.fn(), access:vi.fn(), email:vi.fn() }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: () => ({
  rpc: mocks.claim,from:mocks.from,
}) }))
vi.mock('./connection', () => ({ EMC_ORGANIZATION_ID:'emc',
  connectedQboReadAccess:mocks.access }))
vi.mock('@/server/sales-native/patient-email-delivery', () => ({
  sendPatientInvoice:mocks.email,
}))

import { issuePatientQboInvoice, qboProductName } from './automatic-invoice'

const job = {
  id:'job',organization_id:'emc',enrollment_intent_id:'intent',
  patient_identity_id:'patient',contact_id:'contact',opportunity_id:'opportunity',
  plan:'ESSENTIAL',membership_type:'FAMILY',duration:'MONTHLY',
  amount_cents:19998,state:'LINKED',qbo_customer_id:'321',
  qbo_invoice_id:'1134',qbo_invoice_number:'1134',
  created_at:'2026-10-23T23:57:21Z',
}

function query(result: unknown) {
  const chain = {
    select:vi.fn(),eq:vi.fn(),gte:vi.fn(),order:vi.fn(),update:vi.fn(),
    limit:vi.fn(async () => result),maybeSingle:vi.fn(async () => result),
  }
  for (const method of ['select','eq','gte','order','update'] as const)
    chain[method].mockReturnValue(chain)
  return chain
}

const qaInvoice = {Id:'808',DocNumber:'CS-TEST',PrivateNote:'LILLY enrollment intent',
  SyncToken:'1',CustomerRef:{value:'321'},TotalAmt:199.98,Balance:199.98,
  Line:[{Amount:199.98,DetailType:'SalesItemLineDetail',
    SalesItemLineDetail:{ItemRef:{value:'7'},Qty:1}}],
  InvoiceLink:'https://connect.intuit.com/t/qa-link'}

beforeEach(() => vi.clearAllMocks())

describe('automatic QBO invoice safety', () => {
  it('uses the exact existing QBO product name', () => {
    expect(qboProductName(job as never)).toBe(
      'Corazón Salud - Essential - Family - Month-to-Month')
  })

  it('returns an already linked invoice without a second provider write', async () => {
    mocks.claim.mockResolvedValueOnce({ data:[job],error:null })
    const result = await issuePatientQboInvoice('patient','intent','qa@example.com')
    expect(result).toEqual({ status:'INVOICE_CREATED',invoiceNumber:'1134' })
    expect(mocks.access).not.toHaveBeenCalled()
    expect(mocks.email).not.toHaveBeenCalled()
  })

  it('holds an uncertain invoice write when no signed create event has arrived', async () => {
    mocks.claim.mockResolvedValueOnce({ data:[{ ...job,state:'INVOICE_WRITE_STARTED' }],error:null })
    mocks.from.mockImplementation((table: string) => table === 'sales_contacts'
      ? query({data:{email:'qa@example.com',first_name:'QA',last_name:'Patient',
        do_not_email:false},error:null})
      : query({data:[],error:null}))
    const client = {companyInfo:vi.fn(async () => ({name:'Eminat Medical Center LLC'})),
      itemByName:vi.fn(async () => ({Id:'7',Taxable:false})),
      invoiceForRecovery:vi.fn(),createInvoice:vi.fn()}
    mocks.access.mockResolvedValueOnce({client,realmId:'123',accessToken:'synthetic'})
    const result = await issuePatientQboInvoice('patient','intent','qa@example.com')
    expect(result).toEqual({ status:'PENDING_RECONCILIATION' })
    expect(client.invoiceForRecovery).not.toHaveBeenCalled()
    expect(client.createInvoice).not.toHaveBeenCalled()
  })

  it('recovers the one matching webhook invoice and links it without another create', async () => {
    mocks.claim.mockResolvedValueOnce({ data:[{ ...job,state:'INVOICE_WRITE_STARTED',
      qbo_invoice_id:null,qbo_invoice_number:null }],error:null })
      .mockResolvedValueOnce({data:{},error:null})
    mocks.from.mockImplementation((table: string) => {
      if (table === 'sales_contacts') return query({data:{email:'qa@example.com',
        first_name:'QA',last_name:'Patient',do_not_email:false},error:null})
      if (table === 'sales_qbo_webhook_events') return query({data:[{entity_id:'808'}],error:null})
      return query({data:{id:'job'},error:null})
    })
    const client = {companyInfo:vi.fn(async () => ({name:'Eminat Medical Center LLC'})),
      itemByName:vi.fn(async () => ({Id:'7',Taxable:false})),
      invoiceForRecovery:vi.fn(async () => ({...qaInvoice,DocNumber:undefined})),
      numberExistingInvoice:vi.fn(async () => qaInvoice),
      invoiceWithLink:vi.fn(async () => qaInvoice),createInvoice:vi.fn()}
    mocks.access.mockResolvedValueOnce({client,realmId:'123',accessToken:'synthetic'})
    const result = await issuePatientQboInvoice('patient','intent','qa@example.com')
    expect(result).toEqual({status:'INVOICE_CREATED',invoiceNumber:'CS-TEST'})
    expect(client.invoiceForRecovery).toHaveBeenCalledWith('123','synthetic','808')
    expect(client.numberExistingInvoice).toHaveBeenCalledTimes(1)
    expect(client.createInvoice).not.toHaveBeenCalled()
    expect(mocks.claim).toHaveBeenCalledTimes(2)
  })

  it('never links an invoice whose private enrollment reference belongs elsewhere', async () => {
    mocks.claim.mockResolvedValueOnce({data:[{...job,state:'INVOICE_WRITE_STARTED',
      qbo_invoice_id:null,qbo_invoice_number:null}],error:null})
    mocks.from.mockImplementation((table: string) => table === 'sales_contacts'
      ? query({data:{email:'qa@example.com',first_name:'QA',last_name:'Patient',
        do_not_email:false},error:null})
      : query({data:[{entity_id:'808'}],error:null}))
    const client = {companyInfo:vi.fn(async () => ({name:'Eminat Medical Center LLC'})),
      itemByName:vi.fn(async () => ({Id:'7',Taxable:false})),
      invoiceForRecovery:vi.fn(async () => ({...qaInvoice,
        PrivateNote:'LILLY enrollment other-intent'})),
      numberExistingInvoice:vi.fn(),createInvoice:vi.fn()}
    mocks.access.mockResolvedValueOnce({client,realmId:'123',accessToken:'synthetic'})
    expect(await issuePatientQboInvoice('patient','intent','qa@example.com'))
      .toEqual({status:'PENDING_RECONCILIATION'})
    expect(client.numberExistingInvoice).not.toHaveBeenCalled()
    expect(client.createInvoice).not.toHaveBeenCalled()
  })

  it('refuses to link a job owned by another patient', async () => {
    mocks.claim.mockResolvedValueOnce({ data:[{ ...job,patient_identity_id:'other' }],error:null })
    await expect(issuePatientQboInvoice('patient','intent','qa@example.com'))
      .rejects.toThrow('QBO_INVOICE_CLAIM_FAILED')
    expect(mocks.access).not.toHaveBeenCalled()
  })
})
