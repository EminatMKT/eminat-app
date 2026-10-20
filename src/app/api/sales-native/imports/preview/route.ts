import { NativeSalesAuthError, nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { type ColumnMapping, type ImportResource } from '@/server/sales-native/import-mapping'
import { MAX_IMPORT_BYTES, parseImportFile } from '@/server/sales-native/import-parser'
import { prepareImportPreview } from '@/server/sales-native/import-preview'
import { salesCan } from '@/server/sales-native/policy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function error(code: string, status: number) {
  return Response.json({ code }, { status, headers: { 'Cache-Control': 'no-store' } })
}

/** Detection and validation only; this endpoint never writes commercial records. */
export async function POST(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    if (!salesCan(actor, 'sales:write')) return error('SALES_ACCESS_DENIED', 403)
    const claimed = Number(request.headers.get('content-length'))
    if (Number.isFinite(claimed) && claimed > MAX_IMPORT_BYTES + 16384)
      return error('FILE_SIZE_INVALID', 413)
    let form: FormData
    try { form = await request.formData() } catch { return error('INVALID_MULTIPART', 400) }
    const resource = form.get('resource')
    if (resource !== 'leads' && resource !== 'contacts') return error('INVALID_RESOURCE', 400)
    const file = form.get('file')
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_IMPORT_BYTES)
      return error('FILE_SIZE_INVALID', 413)
    const buffer = Buffer.from(await file.arrayBuffer())
    const sheets = parseImportFile(file.name, file.type || 'application/octet-stream', buffer)
    const sheetName = form.get('sheetName')
    const selected = sheetName ? sheets.find(item => item.name === sheetName) : sheets[0]
    if (!selected || (sheetName && typeof sheetName !== 'string')) return error('INVALID_SHEET', 422)
    const mappingValue = form.get('mapping')
    let mapping: ColumnMapping[] | undefined
    if (mappingValue !== null) {
      if (typeof mappingValue !== 'string' || mappingValue.length > 10000) return error('INVALID_MAPPING', 422)
      try { mapping = JSON.parse(mappingValue) as ColumnMapping[] }
      catch { return error('INVALID_MAPPING', 422) }
      if (!Array.isArray(mapping) || mapping.length > 100 || mapping.some(item =>
        !item || typeof item !== 'object' || !Number.isInteger(item.column) ||
        typeof item.field !== 'string')) return error('INVALID_MAPPING', 422)
    }
    const sourceValue = form.get('defaultSource')
    if (sourceValue !== null && (typeof sourceValue !== 'string' || sourceValue.length > 500))
      return error('INVALID_SOURCE', 422)
    const preview = prepareImportPreview(selected, resource as ImportResource, mapping,
      typeof sourceValue === 'string' ? sourceValue : undefined)
    const { mapped: _mapped, ...publicPreview } = preview
    return Response.json({ data: { ...publicPreview,
      sheets: sheets.map(sheet => ({ name: sheet.name, rows: sheet.rows.length, headers: sheet.headers })) } },
    { headers: { 'Cache-Control': 'no-store' } })
  } catch (cause) {
    if (cause instanceof NativeSalesAuthError) return nativeSalesErrorResponse(cause)
    if (cause instanceof Error && /^[A-Z0-9_]{2,80}$/.test(cause.message))
      return error(cause.message, 422)
    return nativeSalesErrorResponse(cause)
  }
}
