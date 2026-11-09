import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  verifier: false,
  invoiceReady: true,
  verified: false,
  membershipId: null as string | null,
  sent: [] as string[],
}))
vi.mock('@/server/sales-native/patient-qbo-auth', () => ({
  patientQboActor: async () => state.verifier ? { verifier: true, memberId: 'reviewer' } : null,
}))
vi.mock('@/server/sales-native/patient-email-delivery', () => ({
  sendPatientInvoice: async () => { state.sent.push('invoice'); return { status: 'SENT' } },
  sendPatientActivation: async () => { state.sent.push('activation'); return { status: 'SENT' } },
}))
vi.mock('@/shared/db/supabaseAdmin', () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      const chain = {
        select: () => chain, eq: () => chain, is: () => chain,
        maybeSingle: async () => ({ error: null, data:
          table === 'sales_patient_enrollment_intents'
            ? { patient_identity_id: 'identity', membership_id: state.membershipId }
            : table === 'sales_patient_qbo_manual'
              ? { qbo_invoice_number: state.invoiceReady ? '1133' : null,
                qbo_hosted_payment_url: state.invoiceReady ? 'https://connect.intuit.com/t/qa' : null,
                verification_state: state.verified ? 'PAYMENT_VERIFIED' : 'INVOICE_CREATED',
                qa_synthetic: false }
              : table === 'sales_patient_identities' ? { contact_id: 'contact' }
                : table === 'sales_contacts' ? { id: 'contact', email: 'patient@example.test',
                  first_name: 'Patient', do_not_email: false }
                  : table === 'sales_memberships' ? { status: 'ACTIVE' } : null }),
      }
      return chain
    },
  }),
}))

import { POST } from './route'
const intentId = '11111111-1111-4111-8111-111111111111'
const request = (kind: string) => new Request('https://app.test/api/sales-native/patient-email/recover', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ kind, intentId }),
})

describe('patient email recovery', () => {
  beforeEach(() => { state.verifier = false; state.invoiceReady = true;
    state.verified = false; state.membershipId = null; state.sent.length = 0 })

  it('denies a Seller before reading patient or invoice records', async () => {
    expect((await POST(request('invoice'))).status).toBe(403)
    expect(state.sent).toHaveLength(0)
  })

  it('never sends an invoice email before the real hosted invoice exists', async () => {
    state.verifier = true; state.invoiceReady = false
    expect((await POST(request('invoice'))).status).toBe(409)
    expect(state.sent).toHaveLength(0)
  })

  it('recovers the email from the linked invoice without caller-supplied recipient', async () => {
    state.verifier = true
    const response = await POST(request('invoice'))
    expect(response.status).toBe(200)
    expect(state.sent).toEqual(['invoice'])
  })

  it('does not send activation mail before verified payment and active membership', async () => {
    state.verifier = true; state.membershipId = '22222222-2222-4222-8222-222222222222'
    expect((await POST(request('activation'))).status).toBe(409)
    expect(state.sent).toHaveLength(0)
  })
})
