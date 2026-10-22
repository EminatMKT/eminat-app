import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ actor: vi.fn(), rpc: vi.fn() }))
vi.mock('@/server/sales-native/patient-qbo-auth', () => ({ patientQboActor: mocks.actor }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: () => ({ rpc: mocks.rpc }) }))
vi.mock('@/server/sales-native/auth', () => ({ nativeSalesErrorResponse: () => Response.json({ code: 'ERROR' }, { status: 503 }) }))
vi.mock('@/server/sales-native/errors', () => ({ nativeSalesDatabaseError: () => Response.json({ code: 'ERROR' }, { status: 503 }) }))

import { POST } from './route'

describe('manual invoice void confirmation', () => {
  it('rejects a Seller before reading the request body or writing', async () => {
    mocks.actor.mockResolvedValue({ memberId: '11111111-1111-4111-8111-111111111111', verifier: false })
    mocks.rpc.mockClear()
    const response = await POST(new Request('https://app.test/api/sales-native/patient-qbo/void', {
      method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' },
    }))
    expect(response.status).toBe(403)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('requires an exact, explicit confirmation from an authorized verifier', async () => {
    mocks.actor.mockResolvedValue({ memberId: '11111111-1111-4111-8111-111111111111', verifier: true })
    mocks.rpc.mockClear()
    const response = await POST(new Request('https://app.test/api/sales-native/patient-qbo/void', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intentId: '22222222-2222-4222-8222-222222222222',
        invoiceNumber: '1132', evidence: 'QBO void confirmed', confirmation: 'VOID' }),
    }))
    expect(response.status).toBe(422)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
