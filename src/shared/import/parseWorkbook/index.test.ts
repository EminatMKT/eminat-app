import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseWorkbook, readSheet } from './index'

function libroDePrueba(): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Patient Name', 'DOB'], ['ACEBEY,JONATHAN', 39872],
  ]), 'eClinicalWorks')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Name', 'DOB'], ['Javier - Andrade', 27958],
  ]), 'eClinPro')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

describe('parseWorkbook', () => {
  it('lista las hojas en orden', async () => {
    expect((await parseWorkbook(libroDePrueba())).hojas).toEqual(['eClinicalWorks', 'eClinPro'])
  })
})

describe('readSheet', () => {
  it('devuelve headers y filas de la hoja pedida', async () => {
    const { headers, rows } = await readSheet(libroDePrueba(), 'eClinPro')
    expect(headers).toEqual(['Name', 'DOB'])
    expect(rows[0][0]).toBe('Javier - Andrade')
  })

  it('la fecha sale CRUDA como serial, no convertida', async () => {
    // Si SheetJS la devolviera como Date, la clave de origen cambiaría de formato
    // y el import dejaría de reconocer las filas ya cargadas.
    const { rows } = await readSheet(libroDePrueba(), 'eClinicalWorks')
    expect(rows[0][1]).toBe('39872')
  })
})
