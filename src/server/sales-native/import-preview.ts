import { autoMapImportColumns, mapImportRow, type ColumnMapping, type ImportResource } from './import-mapping'
import type { ParsedSheet } from './import-parser'

export type ImportPreviewRow = { rowNumber: number; status: 'READY' | 'DUPLICATE' | 'INVALID';
  code?: string; displayName?: string }

/** Preview only. No upload data or patient details are persisted by this step. */
export function prepareImportPreview(sheet: ParsedSheet, resource: ImportResource,
  mapping: ColumnMapping[] = autoMapImportColumns(sheet.headers, resource), defaultSource?: string) {
  const seen = new Set<string>()
  const rows: ImportPreviewRow[] = []
  const mapped: { rowNumber: number; data: Record<string, unknown> }[] = []
  for (const row of sheet.rows) {
    try {
      const data = mapImportRow(row.values, mapping, resource, defaultSource)
      const keys = [data.email && `email:${data.email}`, data.phone &&
        `phone:${String(data.phone).replace(/[^0-9+]/g, '')}`].filter((value): value is string =>
          typeof value === 'string' && value.length > 6)
      const duplicate = keys.some(key => seen.has(key))
      if (duplicate) rows.push({ rowNumber: row.rowNumber, status: 'DUPLICATE',
        displayName: String(data.displayName) })
      else {
        rows.push({ rowNumber: row.rowNumber, status: 'READY', displayName: String(data.displayName) })
        mapped.push({ rowNumber: row.rowNumber, data })
      }
      for (const key of keys) seen.add(key)
    } catch (error) {
      const code = error instanceof Error && /^[A-Z0-9_]{2,80}$/.test(error.message)
        ? error.message : 'VALIDATION_ERROR'
      rows.push({ rowNumber: row.rowNumber, status: 'INVALID', code })
    }
  }
  return { sheetName: sheet.name, headers: sheet.headers, mapping,
    counts: { ready: rows.filter(row => row.status === 'READY').length,
      duplicate: rows.filter(row => row.status === 'DUPLICATE').length,
      invalid: rows.filter(row => row.status === 'INVALID').length },
    rows: rows.slice(0, 100), mapped }
}
