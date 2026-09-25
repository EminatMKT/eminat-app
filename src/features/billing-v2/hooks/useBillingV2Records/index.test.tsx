import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { billingV2Repo, type BillingV2Record } from '@/shared/data'
import type { BillingPaymentInput } from '@/features/billing-v2/domain/types'
import useBillingV2Records from './index'

vi.mock('@/shared/data', () => ({
  billingV2Repo: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))

const input: BillingPaymentInput = {
  recordType: 'payment', scheduledOn: '2026-09-30', scheduledTime: null, title: 'Nómina',
  category: 'payroll', paymentStatus: 'pending', payeeLabel: 'Equipo EMC', amount: null,
  noteText: null, closingApprovalFollowUp: false,
}
let seen: ReturnType<typeof useBillingV2Records> | null = null

function Probe() {
  seen = useBillingV2Records()
  return null
}

describe('useBillingV2Records', () => {
  beforeEach(() => {
    vi.mocked(billingV2Repo).list.mockReset().mockResolvedValue([])
    vi.mocked(billingV2Repo).create.mockReset().mockResolvedValue({ id: 'new' } as BillingV2Record)
    renderToStaticMarkup(<Probe />)
  })

  it('starts out loading, with nothing to show and nothing wrong', () => {
    expect(seen?.loading).toBe(true)
    expect(seen?.records).toEqual([])
    expect(seen?.error).toBeNull()
  })

  // Rendering is not reading: the module gate decides whether the loader ever runs.
  it('reaches the network on no render of its own', () => {
    expect(vi.mocked(billingV2Repo).list).not.toHaveBeenCalled()
  })

  it('offers the whole contract the views agree on', () => {
    const contract = [seen?.reload, seen?.save, seen?.remove]
    contract.forEach((member) => expect(typeof member).toBe('function'))
  })

  // Every view reads the same list, so a write that nobody re-read is a screen that disagrees.
  it('reads the records again after a write, so every view agrees', async () => {
    await seen?.save(null, input)
    expect(vi.mocked(billingV2Repo).list).toHaveBeenCalledTimes(1)
    vi.mocked(billingV2Repo).remove.mockResolvedValue(undefined)
    await seen?.remove('r1')
    expect(vi.mocked(billingV2Repo).list).toHaveBeenCalledTimes(2)
  })
})
