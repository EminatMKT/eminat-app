import { describe, it, expect, vi, beforeEach } from 'vitest'
import { billingV2Repo, type BillingV2Record } from '@/shared/data'
import type { BillingPaymentInput } from '@/features/billing-v2/domain/types'
import mutations from './index'

vi.mock('@/shared/data', () => ({
  billingV2Repo: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))

const input: BillingPaymentInput = {
  recordType: 'payment', scheduledOn: '2026-09-30', scheduledTime: null, title: 'Nómina',
  category: 'payroll', paymentStatus: 'pending', payeeLabel: 'Equipo EMC', amount: null,
  noteText: null, closingApprovalFollowUp: false,
}
// Thrown, not a rejected promise: vitest tracks a mock's promise results and an unhandled
// rejection would be reported against whichever test happened to be running.
function boom(): never {
  throw new Error('network')
}

describe('mutations', () => {
  beforeEach(() => vi.mocked(billingV2Repo).create.mockReset())

  it('creates when there is no record yet, and updates the one there is', async () => {
    vi.mocked(billingV2Repo).create.mockResolvedValue({ id: 'new' } as BillingV2Record)
    vi.mocked(billingV2Repo).update.mockResolvedValue({ id: 'r1' } as BillingV2Record)
    expect(await mutations.save(null, input)).toBe(true)
    expect(vi.mocked(billingV2Repo).create).toHaveBeenCalledWith(input)
    expect(await mutations.save('r1', input)).toBe(true)
    expect(vi.mocked(billingV2Repo).update).toHaveBeenCalledWith('r1', input)
  })

  // A save that fails answers false and the caller keeps every value on screen.
  it('answers false when the save does not land, instead of throwing at the form', async () => {
    vi.mocked(billingV2Repo).create.mockImplementationOnce(boom)
    await expect(mutations.save(null, input)).resolves.toBe(false)
  })

  it('answers false when the delete does not land, so the row stays', async () => {
    vi.mocked(billingV2Repo).remove.mockImplementationOnce(boom)
    await expect(mutations.drop('r1')).resolves.toBe(false)
  })

  it('answers true when the delete lands', async () => {
    vi.mocked(billingV2Repo).remove.mockResolvedValue(undefined)
    await expect(mutations.drop('r1')).resolves.toBe(true)
  })
})
