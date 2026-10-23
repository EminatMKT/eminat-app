import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ claim:vi.fn(), access:vi.fn(), email:vi.fn() }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: () => ({
  rpc: mocks.claim,
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
}

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

  it('holds an uncertain invoice write instead of repeating it', async () => {
    mocks.claim.mockResolvedValueOnce({ data:[{ ...job,state:'INVOICE_WRITE_STARTED' }],error:null })
    const result = await issuePatientQboInvoice('patient','intent','qa@example.com')
    expect(result).toEqual({ status:'PENDING_RECONCILIATION' })
    expect(mocks.access).not.toHaveBeenCalled()
  })

  it('refuses to link a job owned by another patient', async () => {
    mocks.claim.mockResolvedValueOnce({ data:[{ ...job,patient_identity_id:'other' }],error:null })
    await expect(issuePatientQboInvoice('patient','intent','qa@example.com'))
      .rejects.toThrow('QBO_INVOICE_CLAIM_FAILED')
    expect(mocks.access).not.toHaveBeenCalled()
  })
})
