import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { MAX_IMPORT_BYTES, parseImportFile } from './import-parser'

describe('native Sales import parser', () => {
  it('detects a semicolon CSV and retains quoted delimiters and newlines', () => {
    const csv = Buffer.from('Nombre;Correo;Fuente\r\n"QA; Persona";qa@example.invalid;Referido\r\n"QA\nOtra";other@example.invalid;Web\r\n')
    const [sheet] = parseImportFile('qa.csv', 'text/csv', csv)
    expect(sheet.headers).toEqual(['Nombre', 'Correo', 'Fuente'])
    expect(sheet.rows.map(row => row.values[0])).toEqual(['QA; Persona', 'QA\nOtra'])
  })

  it('reads an XLSX sheet and marks formulas for rejection during mapping', () => {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([['Name', 'Email'], ['QA Person', 'qa@example.invalid']])
    worksheet.B2 = { t: 'n', f: '1+1', v: 2 }
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads')
    const file = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
    const [sheet] = parseImportFile('qa.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', file)
    expect(sheet.name).toBe('Leads')
    expect(sheet.rows[0].values).toEqual(['QA Person', '__ANNIE_FORMULA_CELL__'])
  })

  it('rejects malformed files and oversized uploads before parsing', () => {
    expect(() => parseImportFile('qa.xlsx', 'application/zip', Buffer.from('not a zip')))
      .toThrow('INVALID_XLSX')
    expect(MAX_IMPORT_BYTES).toBe(4 * 1024 * 1024)
    expect(() => parseImportFile('qa.csv', 'text/csv', Buffer.alloc(MAX_IMPORT_BYTES + 1)))
      .toThrow('FILE_SIZE_INVALID')
  })

  it('rejects extra or overlong cells instead of silently dropping imported data', () => {
    expect(() => parseImportFile('qa.csv', 'text/csv', Buffer.from('Name,Email\nQA,qa@example.invalid,unexpected')))
      .toThrow('UNMAPPED_EXTRA_COLUMNS')
    expect(() => parseImportFile('qa.csv', 'text/csv', Buffer.from(`Name\n${'a'.repeat(10001)}`)))
      .toThrow('CELL_TOO_LONG')
  })
})
