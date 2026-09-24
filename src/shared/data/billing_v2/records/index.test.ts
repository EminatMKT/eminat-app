import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BillingMonthNoteInput } from '@/features/billing-v2/domain/types'
import fakeClient from '../fake-client'
import billingV2Records from './index'

const holder = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db', () => ({ supabase: { from: holder.from } }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: holder.from } }))

const OK = { data: { id: 'row-1' }, error: null }
const DENIED = { data: null, error: { message: 'permission denied for table billing_v2_records' } }

const NOTE: BillingMonthNoteInput = {
  recordType: 'month_note', noteMonth: '2026-09-01', noteText: 'Closes on the fifth',
}

function connect(replies: unknown[]) {
  const client = fakeClient(replies)
  holder.from.mockImplementation(client.from)
  return client
}

beforeEach(() => { holder.from.mockReset() })

describe('billing v2 mutations', () => {
  it('makes no request at all when the input is invalid', async () => {
    connect([OK, OK])
    await expect(billingV2Records.create({ ...NOTE, noteMonth: '2026-09-15' })).rejects.toThrow()
    await expect(billingV2Records.update('id-1', { ...NOTE, noteText: '  ' })).rejects.toThrow()
    expect(holder.from).not.toHaveBeenCalled()
  })

  it('sends the validated row and addresses a single row by id', async () => {
    const client = connect([OK, OK, OK])
    await billingV2Records.create(NOTE)
    await billingV2Records.update('id-1', NOTE)
    await billingV2Records.remove('id-2')
    expect(client.sent[0]).toMatchObject({ record_type: 'month_note', note_month: NOTE.noteMonth })
    expect(client.calls).toContain('eq:id:id-1')
    expect(client.calls).toContain('eq:id:id-2')
    expect(client.calls).toContain('delete')
  })

  it('keeps the database cause without repeating its text', async () => {
    connect([DENIED])
    let failure: Error | undefined
    try { await billingV2Records.create(NOTE) } catch (error) { failure = error as Error }
    expect(failure).toBeDefined()
    expect(failure?.message).not.toContain('permission denied')
    expect(failure?.cause).toBe(DENIED.error)
  })
})
