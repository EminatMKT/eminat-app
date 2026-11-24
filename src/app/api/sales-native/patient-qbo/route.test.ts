import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  actor: { memberId: 'finance', verifier: true } as { memberId: string; verifier: boolean } | null,
  rpc: vi.fn(), sendInvoice: vi.fn(),
}))
vi.mock('@/server/sales-native/patient-qbo-auth', () => ({ patientQboActor: async () => state.actor }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: () => ({ rpc: state.rpc }) }))
vi.mock('@/server/sales-native/patient-email-delivery', () => ({ sendPatientInvoice: state.sendInvoice }))
import { POST } from './route'

const input = {
  intentId: '11111111-1111-4111-8111-111111111111', action: 'VERIFY_PAYMENT',
  paymentReference: 'QBO-SYNTHETIC-REFERENCE', paymentConfirmedAt: '2026-11-24T18:00:00Z',
  confirmation: 'VERIFY PAID IN QBO',
}
const request = (body: Record<string, unknown> = input) => new Request(
  'https://staging.example/api/sales-native/patient-qbo', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
beforeEach(() => {
  vi.clearAllMocks()
  state.actor = { memberId: 'finance', verifier: true }
  state.rpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'PATIENT_QBO_STATE_CONFLICT' } })
})

describe('finance verification conflict response', () => {
  it('returns the canonical conflict once, without retrying verification or sending mail', async () => {
    const response = await POST(request())
    expect(response.status).toBe(409)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ code: 'PATIENT_QBO_STATE_CONFLICT' })
    expect(state.rpc).toHaveBeenCalledTimes(1)
    expect(state.rpc).toHaveBeenCalledWith('native_sales_patient_qbo_update', expect.objectContaining({
      p_actor_member_id: 'finance', p_intent_id: input.intentId,
      p_action: 'VERIFY_PAYMENT', p_payment_reference: input.paymentReference, p_qa_synthetic: false,
    }))
    expect(state.sendInvoice).not.toHaveBeenCalled()
  })
  it.each([null, { memberId: 'seller', verifier: false }])('preserves authorization denial for %j', async actor => {
    state.actor = actor
    const response = await POST(request())
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ code: 'PAYMENT_VERIFICATION_FORBIDDEN' })
    expect(state.rpc).not.toHaveBeenCalled()
  })
  it('still requires explicit finance confirmation before database access', async () => {
    const { confirmation: _confirmation, ...body } = input
    const response = await POST(request(body))
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ code: 'EXPLICIT_PAYMENT_CONFIRMATION_REQUIRED' })
    expect(state.rpc).not.toHaveBeenCalled()
  })
  it('keeps unexpected database failures sanitized and unavailable', async () => {
    state.rpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'private upstream details' } })
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: 'SALES_UNAVAILABLE' })
    expect(state.rpc).toHaveBeenCalledTimes(1)
    expect(state.sendInvoice).not.toHaveBeenCalled()
  })
  it('preserves the successful verification response and original RPC', async () => {
    state.rpc.mockResolvedValue({ data: { verification_state: 'PAYMENT_VERIFIED' }, error: null })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { verification_state: 'PAYMENT_VERIFIED' }, emailDelivery: null })
    expect(state.rpc).toHaveBeenCalledTimes(1)
    expect(state.sendInvoice).not.toHaveBeenCalled()
  })
})
