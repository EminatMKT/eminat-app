import { describe,expect,it } from 'vitest'
import type { QboInvoice,QboPayment } from './client'
import { decideQboPayment,invoiceIdsForPayment,patientInvoiceMappingValid } from './reconciliation'

const invoice = (overrides: Partial<QboInvoice> = {}): QboInvoice => ({
  Id:'1133',DocNumber:'1133',CustomerRef:{ value:'321' },
  TotalAmt:199.98,Balance:0,CurrencyRef:{ value:'USD' },
  LinkedTxn:[{ TxnId:'900',TxnType:'Payment' }],...overrides,
})
const payment = (overrides: Partial<QboPayment> = {}): QboPayment => ({
  Id:'900',CustomerRef:{ value:'321' },TotalAmt:199.98,TxnDate:'2026-10-22',
  Line:[{ Amount:199.98,LinkedTxn:[{ TxnId:'1133',TxnType:'Invoice' }] }],
  ...overrides,
})
const decide = (overrides: Partial<Parameters<typeof decideQboPayment>[0]> = {}) =>
  decideQboPayment({ invoice:invoice(),payments:[payment()],invoiceId:'1133',
    invoiceNumber:'1133',customerId:'321',amountCents:19998,alreadyActive:false,
    ...overrides })

describe('provider-read QBO reconciliation decision',() => {
  it('accepts a fully paid, correctly linked Invoice and Payment',() => {
    expect(decide()).toMatchObject({ status:'PAID',paymentIds:['900'] })
    expect(invoiceIdsForPayment(payment())).toEqual(['1133'])
  })
  it('handles repeat observations with the same stable payment reference',() => {
    expect(decide()).toEqual(decide())
  })
  it('rejects a wrong invoice, customer or currency mapping',() => {
    expect(decide({ invoice:invoice({ Id:'999' }) }).status).toBe('REVIEW')
    expect(decide({ invoice:invoice({ CustomerRef:{ value:'other' } }) }).status).toBe('REVIEW')
    expect(decide({ invoice:invoice({ CurrencyRef:{ value:'CAD' } }) }).status).toBe('REVIEW')
  })
  it('rejects a payment applied to another patient invoice',() => {
    expect(decide({ payments:[payment({ CustomerRef:{ value:'other' } })] }).status).toBe('REVIEW')
    expect(decide({ payments:[payment({ Line:[{ Amount:199.98,
      LinkedTxn:[{ TxnId:'other',TxnType:'Invoice' }] }] })] }).status).toBe('RETRY')
  })
  it('holds unpaid and partially paid invoices',() => {
    expect(decide({ invoice:invoice({ Balance:199.98,LinkedTxn:[] }),payments:[] }).status).toBe('PENDING')
    expect(decide({ invoice:invoice({ Balance:99.98 }),payments:[payment({
      TotalAmt:100,Line:[{ Amount:100,LinkedTxn:[{ TxnId:'1133',TxnType:'Invoice' }] }],
    })] }).status).toBe('PENDING')
  })
  it('does not activate on an out-of-order payment notification',() => {
    expect(decide({ invoice:invoice({ LinkedTxn:[] }),payments:[payment()] }).status).toBe('RETRY')
  })
  it('flags an already active membership and a later reversal for review',() => {
    expect(decide({ alreadyActive:true }).status).toBe('REVIEW')
    expect(decide({ alreadyActive:true,invoice:invoice({ Balance:199.98 }) }))
      .toMatchObject({ status:'REVIEW',reason:'ACTIVE_INVOICE_REVERSED_OR_PARTIAL' })
  })
  it('requires the exact full amount applied to this invoice',() => {
    expect(decide({ payments:[payment({ Line:[{ Amount:199.97,
      LinkedTxn:[{ TxnId:'1133',TxnType:'Invoice' }] }] })] }).status).toBe('RETRY')
    expect(decide({ payments:[payment({ Line:[{ Amount:199.99,
      LinkedTxn:[{ TxnId:'1133',TxnType:'Invoice' }] }] })] }).status).toBe('REVIEW')
  })
})

describe('LILLY patient invoice binding',() => {
  const binding = () => ({ organizationId:'emc',
    mapping:{ organization_id:'emc',enrollment_intent_id:'intent',
      opportunity_id:'opportunity',base_invoice_amount_cents:19998 },
    intent:{ organization_id:'emc',id:'intent',opportunity_id:'opportunity',
      patient_identity_id:'identity',amount_cents:19998 },
    opportunity:{ organization_id:'emc',id:'opportunity',primary_contact_id:'contact',
      amount:199.98,currency:'USD' },
    identity:{ organization_id:'emc',id:'identity',contact_id:'contact' },
  })
  it('requires one explicit identity, contact, enrollment and Opportunity chain',() => {
    expect(patientInvoiceMappingValid(binding())).toBe(true)
    const wrongPatient = binding()
    wrongPatient.identity.contact_id = 'another-patient'
    expect(patientInvoiceMappingValid(wrongPatient)).toBe(false)
    const wrongOpportunity = binding()
    wrongOpportunity.mapping.opportunity_id = 'another-opportunity'
    expect(patientInvoiceMappingValid(wrongOpportunity)).toBe(false)
  })
  it('rejects cross-organization and amount mismatches',() => {
    const wrongOrg = binding()
    wrongOrg.identity.organization_id = 'stratix'
    expect(patientInvoiceMappingValid(wrongOrg)).toBe(false)
    const wrongAmount = binding()
    wrongAmount.opportunity.amount = 119.98
    expect(patientInvoiceMappingValid(wrongAmount)).toBe(false)
  })
})
