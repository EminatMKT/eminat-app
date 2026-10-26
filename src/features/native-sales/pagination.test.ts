import { describe, expect, it, vi } from 'vitest'
import { allSalesPages } from './pagination'

const page = (start: number, count: number) => Array.from({ length: count }, (_, n) => ({ id: String(start + n) }))
describe('authorized Sales selector pagination', () => {
  it('loads records beyond 100, follows the cursor and preserves the filter on every page', async () => {
    const request = vi.fn().mockResolvedValueOnce({ data: page(0, 100), nextOffset: 100 })
      .mockResolvedValueOnce({ data: page(100, 100), nextOffset: 200 })
      .mockResolvedValueOnce({ data: page(200, 3), nextOffset: null })
    expect(await allSalesPages(request, 'opportunities?q=example')).toHaveLength(203)
    expect(request.mock.calls.map(call => call[0])).toEqual([
      'opportunities?q=example&limit=100&offset=0',
      'opportunities?q=example&limit=100&offset=100',
      'opportunities?q=example&limit=100&offset=200',
    ])
  })
  it('handles the empty terminal page at an exact page boundary', async () => {
    const request = vi.fn().mockResolvedValueOnce({ data: page(0, 100), nextOffset: 100 })
      .mockResolvedValueOnce({ data: [], nextOffset: null })
    expect(await allSalesPages(request, 'memberships')).toHaveLength(100)
  })
  it('deduplicates overlapping pages without hiding later records', async () => {
    const request = vi.fn().mockResolvedValueOnce({ data: [{ id: 'a' }], nextOffset: 100 })
      .mockResolvedValueOnce({ data: [{ id: 'a' }, { id: 'b' }], nextOffset: null })
    expect(await allSalesPages(request, 'memberships')).toEqual([{ id: 'a' }, { id: 'b' }])
  })
  it.each([0, -1, 100001, '100', undefined, 0.5])('fails closed on an invalid cursor %s', async cursor => {
    await expect(allSalesPages(vi.fn().mockResolvedValue({ data: [{ id: 'a' }], nextOffset: cursor }), 'memberships'))
      .rejects.toThrow('SALES_PAGINATION_UNAVAILABLE')
  })
  it('propagates later failures instead of returning an incomplete list', async () => {
    const request = vi.fn().mockResolvedValueOnce({ data: page(0, 100), nextOffset: 100 })
      .mockRejectedValueOnce(new Error('ACCESS_REVOKED'))
    await expect(allSalesPages(request, 'memberships')).rejects.toThrow('ACCESS_REVOKED')
  })
  it('stops superseded searches before requesting another page', async () => {
    let cancelled = false
    const request = vi.fn().mockImplementation(async () => {
      cancelled = true
      return { data: page(0, 100), nextOffset: 100 }
    })
    await expect(allSalesPages(request, 'contacts?q=old', () => cancelled)).rejects.toThrow('SALES_LOAD_CANCELLED')
    expect(request).toHaveBeenCalledTimes(1)
  })
})
