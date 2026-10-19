import 'server-only'
import { TextDecoder } from 'node:util'
import * as XLSX from 'xlsx'

// Keep multipart requests below Vercel's 4.5 MB function-body ceiling.
export const MAX_IMPORT_BYTES = 4 * 1024 * 1024
export const MAX_IMPORT_ROWS = 5000
export const MAX_IMPORT_COLUMNS = 100
export type ParsedRow = { rowNumber: number; values: string[] }
export type ParsedSheet = { name: string; headers: string[]; rows: ParsedRow[] }

function decodeCsv(buffer: Buffer) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '') }
  catch { return new TextDecoder('windows-1252').decode(buffer).replace(/^\uFEFF/, '') }
}

function delimiterOf(text: string) {
  const sample = text.split(/\r?\n/, 5).slice(0, 5).join('\n')
  const candidates = [',', ';', '\t', '|']
  const counts = candidates.map(delimiter => {
    let quoted = false; let count = 0
    for (let index = 0; index < sample.length; index++) {
      if (sample[index] === '"') {
        if (quoted && sample[index + 1] === '"') index++
        else quoted = !quoted
      } else if (!quoted && sample[index] === delimiter) count++
    }
    return count
  })
  return candidates[counts.indexOf(Math.max(...counts))]
}

function sheet(name: string, matrix: string[][]): ParsedSheet {
  const headerIndex = matrix.findIndex(row => row.some(value => value.trim()))
  if (headerIndex < 0) return { name, headers: [], rows: [] }
  const headers = matrix[headerIndex].map(value => value.trim())
  if (!headers.length || headers.length > MAX_IMPORT_COLUMNS) throw new Error('TOO_MANY_COLUMNS')
  if (headers.some(value => value.length > 255)) throw new Error('HEADER_TOO_LONG')
  if (matrix.slice(headerIndex + 1).some(values =>
    values.length > headers.length && values.slice(headers.length).some(value => value.trim())))
    throw new Error('UNMAPPED_EXTRA_COLUMNS')
  if (matrix.slice(headerIndex + 1).some(values => values.some(value => value.length > 10000)))
    throw new Error('CELL_TOO_LONG')
  return { name: name.slice(0, 255), headers,
    rows: matrix.slice(headerIndex + 1).map((values, index) => ({
      rowNumber: headerIndex + index + 2,
      values: headers.map((_, column) => String(values[column] ?? '')),
    })) }
}

export function parseCsv(buffer: Buffer): ParsedSheet[] {
  if (buffer.includes(0)) throw new Error('INVALID_CSV')
  const text = decodeCsv(buffer); const delimiter = delimiterOf(text)
  const matrix: string[][] = []
  let row: string[] = []; let cell = ''; let quoted = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index++ }
      else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"' && cell.length === 0) quoted = true
    else if (char === delimiter) { row.push(cell); cell = '' }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++
      row.push(cell); cell = ''
      if (row.some(value => value.trim())) matrix.push(row)
      row = []
      if (matrix.length > MAX_IMPORT_ROWS + 1) throw new Error('TOO_MANY_ROWS')
    } else cell += char
  }
  if (quoted) throw new Error('INVALID_CSV')
  row.push(cell)
  if (row.some(value => value.trim())) matrix.push(row)
  if (matrix.length > MAX_IMPORT_ROWS + 1) throw new Error('TOO_MANY_ROWS')
  return [sheet('CSV', matrix)]
}

function inspectXlsxZip(buffer: Buffer) {
  let end = -1
  for (let index = Math.max(0, buffer.length - 65557); index <= buffer.length - 22; index++)
    if (buffer.readUInt32LE(index) === 0x06054b50) end = index
  if (end < 0) throw new Error('INVALID_XLSX')
  const count = buffer.readUInt16LE(end + 10); const offset = buffer.readUInt32LE(end + 16)
  if (!count || count > 1000 || offset > buffer.length) throw new Error('INVALID_XLSX')
  let cursor = offset; let expanded = 0
  const names: string[] = []
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50)
      throw new Error('INVALID_XLSX')
    const compressed = buffer.readUInt32LE(cursor + 20)
    const uncompressed = buffer.readUInt32LE(cursor + 24)
    const nameLength = buffer.readUInt16LE(cursor + 28)
    const extraLength = buffer.readUInt16LE(cursor + 30)
    const commentLength = buffer.readUInt16LE(cursor + 32)
    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength)
    if (name.startsWith('/') || name.split('/').includes('..') || name.includes('\\'))
      throw new Error('INVALID_XLSX')
    const lower = name.toLowerCase()
    if (lower.includes('vbaproject') || lower.startsWith('xl/externallinks/'))
      throw new Error('UNSUPPORTED_XLSX_CONTENT')
    if (uncompressed > 25 * 1024 * 1024 || (compressed === 0 && uncompressed > 0) ||
        (compressed > 0 && uncompressed / compressed > 100))
      throw new Error('XLSX_EXPANSION_LIMIT')
    expanded += uncompressed
    if (expanded > 50 * 1024 * 1024) throw new Error('XLSX_EXPANSION_LIMIT')
    names.push(name)
    cursor += 46 + nameLength + extraLength + commentLength
  }
  if (!names.includes('[Content_Types].xml') || !names.includes('xl/workbook.xml') ||
      !names.some(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)))
    throw new Error('INVALID_XLSX')
}

export function parseXlsx(buffer: Buffer): ParsedSheet[] {
  inspectXlsxZip(buffer)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellFormula: true })
  let total = 0
  const sheets = workbook.SheetNames.map(name => {
    const worksheet = workbook.Sheets[name]
    if (!worksheet) throw new Error('INVALID_XLSX')
    const range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1')
    if (range.e.c - range.s.c + 1 > MAX_IMPORT_COLUMNS ||
        range.e.r - range.s.r + 1 > MAX_IMPORT_ROWS + 1) throw new Error('TOO_MANY_ROWS')
    const matrix: string[][] = []
    for (let row = range.s.r; row <= range.e.r; row++) {
      const values: string[] = []
      for (let column = range.s.c; column <= range.e.c; column++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: column })]
        if (cell?.f) values.push('__ANNIE_FORMULA_CELL__')
        else if (!cell || cell.v == null) values.push('')
        else if (cell.v instanceof Date) values.push(cell.v.toISOString().slice(0, 10))
        else values.push(String(cell.v))
      }
      if (values.some(value => value.trim())) matrix.push(values)
    }
    const parsed = sheet(name, matrix)
    total += parsed.rows.length
    if (total > MAX_IMPORT_ROWS) throw new Error('TOO_MANY_ROWS')
    return parsed
  }).filter(item => item.headers.length)
  if (!sheets.length) throw new Error('EMPTY_FILE')
  return sheets
}

export function parseImportFile(filename: string, mime: string, buffer: Buffer): ParsedSheet[] {
  if (!buffer.length || buffer.length > MAX_IMPORT_BYTES) throw new Error('FILE_SIZE_INVALID')
  const extension = filename.toLowerCase().split('.').pop()
  if (extension === 'csv') {
    if (!/^(text\/csv|application\/csv|application\/vnd\.ms-excel|application\/octet-stream)$/i.test(mime))
      throw new Error('FILE_TYPE_INVALID')
    const sheets = parseCsv(buffer)
    if (sheets[0].rows.length > MAX_IMPORT_ROWS) throw new Error('TOO_MANY_ROWS')
    return sheets
  }
  if (extension === 'xlsx') {
    if (!/^(application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/zip|application\/octet-stream)$/i.test(mime))
      throw new Error('FILE_TYPE_INVALID')
    return parseXlsx(buffer)
  }
  throw new Error('FILE_TYPE_INVALID')
}
