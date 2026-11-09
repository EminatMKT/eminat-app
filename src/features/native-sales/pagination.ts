import type { NativeRequest } from './NativeSalesModule'

/** Follow the server's scoped cursor; never publish a partially loaded selector. */
export async function allSalesPages<T extends { id: string }>(
  request: NativeRequest, path: string, cancelled: () => boolean = () => false,
): Promise<T[]> {
  const [resource, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  params.set('limit', '100')
  let offset = 0
  const rows = new Map<string, T>()
  for (;;) {
    if (cancelled()) throw new Error('SALES_LOAD_CANCELLED')
    params.set('offset', String(offset))
    const result = await request(`${resource}?${params}`)
    if (!Array.isArray(result.data)) throw new Error('SALES_RESPONSE_UNAVAILABLE')
    for (const row of result.data) {
      if (!row || typeof row !== 'object' || typeof row.id !== 'string')
        throw new Error('SALES_RESPONSE_UNAVAILABLE')
      rows.set(row.id, row as T)
    }
    if (result.nextOffset === null) return Array.from(rows.values())
    const next = result.nextOffset
    if (!Number.isSafeInteger(next) || (next as number) <= offset ||
      (next as number) > 100000 || !result.data.length)
      throw new Error('SALES_PAGINATION_UNAVAILABLE')
    offset = next as number
  }
}
