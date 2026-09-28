import { beforeEach, describe, expect, it, vi } from 'vitest'
import fakeClient from '../fake-client'
import billingV2Records from './index'

const holder = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db', () => ({ supabase: { from: holder.from } }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: holder.from } }))

const PAGE = 1000
const TAIL = 500

function page(size: number, offset: number) {
  const rows = Array.from({ length: size }, (row, index) => ({ id: `row-${offset + index}` }))
  const reply = { data: rows, error: null }
  return reply
}

beforeEach(() => { holder.from.mockReset() })

describe('billing v2 reads', () => {
  it('returns every row when the table is past the PostgREST page cap', async () => {
    const client = fakeClient([page(PAGE, 0), page(PAGE, PAGE), page(TAIL, PAGE * 2)])
    holder.from.mockImplementation(client.from)
    const records = await billingV2Records.list()
    expect(records).toHaveLength(PAGE * 2 + TAIL)
    expect(client.calls).toContain('range:2000:2999')
  })

  it('pages on a unique key and reads the amount as text', async () => {
    const client = fakeClient([page(1, 0)])
    holder.from.mockImplementation(client.from)
    await billingV2Records.list()
    expect(client.calls).toContain('order:id')
    expect(client.calls.some((call) => call.includes('amount::text'))).toBe(true)
  })

  it('throws instead of answering with an empty list', async () => {
    const client = fakeClient([{ data: null, error: { message: 'permission denied' } }])
    holder.from.mockImplementation(client.from)
    await expect(billingV2Records.list()).rejects.toThrow()
  })
})
