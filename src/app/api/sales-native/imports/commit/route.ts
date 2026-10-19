import { createHash, randomUUID } from 'node:crypto'
import { NativeSalesAuthError, nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { type ColumnMapping } from '@/server/sales-native/import-mapping'
import { MAX_IMPORT_BYTES, parseImportFile } from '@/server/sales-native/import-parser'
import { prepareImportPreview } from '@/server/sales-native/import-preview'
import { salesCan } from '@/server/sales-native/policy'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const fail = (code: string, status: number) =>
  Response.json({ code }, { status, headers: { 'Cache-Control': 'no-store' } })

/** Ten rows per request; retries use a durable, SQL-enforced row receipt. */
export async function POST(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    if (!salesCan(actor, 'sales:write')) return fail('SALES_ACCESS_DENIED', 403)
    const claimed = Number(request.headers.get('content-length'))
    if (Number.isFinite(claimed) && claimed > MAX_IMPORT_BYTES + 16384)
      return fail('FILE_SIZE_INVALID', 413)
    let form: FormData
    try { form = await request.formData() } catch { return fail('INVALID_MULTIPART', 400) }
    const resource = form.get('resource')
    if (resource !== 'leads' && resource !== 'contacts') return fail('INVALID_RESOURCE', 400)
    const file = form.get('file')
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_IMPORT_BYTES)
      return fail('FILE_SIZE_INVALID', 413)
    const start = Number(form.get('start'))
    if (!Number.isSafeInteger(start) || start < 0 || start > 5000) return fail('INVALID_OFFSET', 400)
    const mappingValue = form.get('mapping')
    if (typeof mappingValue !== 'string' || mappingValue.length > 10000)
      return fail('INVALID_MAPPING', 422)
    let mapping: ColumnMapping[]
    try { mapping = JSON.parse(mappingValue) as ColumnMapping[] }
    catch { return fail('INVALID_MAPPING', 422) }
    if (!Array.isArray(mapping) || mapping.length > 100 || mapping.some(item =>
      !item || typeof item !== 'object' || !Number.isInteger(item.column) ||
      typeof item.field !== 'string')) return fail('INVALID_MAPPING', 422)
    const sourceValue = form.get('defaultSource')
    if (sourceValue !== null && (typeof sourceValue !== 'string' || sourceValue.length > 500))
      return fail('INVALID_SOURCE', 422)
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileHash = createHash('sha256').update(buffer).digest('hex')
    const sheets = parseImportFile(file.name, file.type || 'application/octet-stream', buffer)
    const sheetName = form.get('sheetName')
    if (typeof sheetName !== 'string') return fail('INVALID_SHEET', 422)
    const sheet = sheets.find(item => item.name === sheetName)
    if (!sheet) return fail('INVALID_SHEET', 422)
    const preview = prepareImportPreview(sheet, resource, mapping,
      typeof sourceValue === 'string' ? sourceValue : undefined)
    const batch = preview.mapped.slice(start, start + 10)
    const results: { rowNumber: number; status: string; replayed: boolean }[] = []
    for (const row of batch) {
      const key = `imp_${createHash('sha256').update(JSON.stringify([
        fileHash, resource, sheetName, row.rowNumber])).digest('hex')}`
      const payloadHash = createHash('sha256').update(JSON.stringify([row.data, 'SKIP'])).digest('hex')
      const { data, error } = await supabaseAdmin().rpc('native_sales_import_record', {
        p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
        p_resource: resource, p_data: row.data, p_idempotency_key: key,
        p_payload_hash: payloadHash, p_duplicate_mode: 'SKIP', p_request_id: randomUUID(),
      })
      if (error) return nativeSalesDatabaseError(error)
      if (!data || !['CREATED','SKIPPED'].includes(data.status)) return fail('IMPORT_RESULT_INVALID', 503)
      results.push({ rowNumber: row.rowNumber, status: data.status, replayed: data.replayed === true })
    }
    return Response.json({ data: { totalReady: preview.mapped.length,
      nextStart: start + batch.length < preview.mapped.length ? start + batch.length : null,
      results, invalid: preview.counts.invalid, withinFileDuplicates: preview.counts.duplicate } },
    { headers: { 'Cache-Control': 'no-store' } })
  } catch (cause) {
    if (cause instanceof NativeSalesAuthError) return nativeSalesErrorResponse(cause)
    if (cause instanceof Error && /^[A-Z0-9_]{2,80}$/.test(cause.message))
      return fail(cause.message, 422)
    return nativeSalesErrorResponse(cause)
  }
}
