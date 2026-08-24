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

// A diferencia de `libroDePrueba`, acá la celda de fecha se escribe CON formato de fecha real
// aplicado (vía `cellDates: true` en `aoa_to_sheet`, que además le pone el número de formato
// 'm/d/yy'). Es la única forma de que `cellDates: false` en la LECTURA tenga algo que hacer:
// con una celda numérica sin formato (como en `libroDePrueba`), `cellDates` no cambia nada — la
// prueba de mutación de la Tarea 8 lo confirmó.
function libroConFechaFormateada(): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  const hoja = XLSX.utils.aoa_to_sheet([['DOB'], [new Date(2009, 1, 28)]], { cellDates: true })
  XLSX.utils.book_append_sheet(wb, hoja, 'fechaFormateada')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

function bufferDe(bytes: number[]): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.length)
  new Uint8Array(buf).set(bytes)
  return buf
}

describe('parseWorkbook', () => {
  it('lista las hojas en orden', async () => {
    expect((await parseWorkbook(libroDePrueba())).hojas).toEqual(['eClinicalWorks', 'eClinPro'])
  })

  it('rechaza un buffer vacío', async () => {
    await expect(parseWorkbook(new ArrayBuffer(0))).rejects.toThrow()
  })

  it('rechaza texto plano (ej. un .csv renombrado a .xlsx)', async () => {
    const texto = 'nombre,dob\nJuan,1990-01-01\n'
    const bytes = Array.from(texto).map((c) => c.charCodeAt(0))
    await expect(parseWorkbook(bufferDe(bytes))).rejects.toThrow()
  })

  it('rechaza bytes al azar', async () => {
    const bytes = [0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0x10, 0x20]
    await expect(parseWorkbook(bufferDe(bytes))).rejects.toThrow()
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

  it('la fecha sale cruda AUNQUE la celda tenga formato de fecha aplicado', async () => {
    // Esta es la prueba que de verdad ejercita `cellDates`. Con una celda formateada como
    // fecha, `cellDates: true` la leería como Date y `sheet_to_json` la mostraría formateada
    // ('2/28/09'), no como el serial '39872'.
    const { rows } = await readSheet(libroConFechaFormateada(), 'fechaFormateada')
    expect(rows[0][0]).toBe('39872')
  })

  it('lanza si se pide una hoja que no existe', async () => {
    await expect(readSheet(libroDePrueba(), 'NoExiste')).rejects.toThrow()
  })
})
