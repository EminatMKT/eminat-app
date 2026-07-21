import { describe, it, expect } from 'vitest'
import { detectSeparator, parseDelimited } from './delimited'

describe('detectSeparator', () => {
  it('detecta el separador más frecuente en la cabecera', () => {
    expect(detectSeparator('date_added,conditions,nct')).toBe(',')
    expect(detectSeparator('date_added;conditions;nct')).toBe(';')
    expect(detectSeparator('date_added\tconditions\tnct')).toBe('\t')
    expect(detectSeparator('date_added:conditions:nct')).toBe(':')
  })
  it('default a coma sin señal clara', () => {
    expect(detectSeparator('unacolumna')).toBe(',')
  })
  it('ignora separadores dentro de comillas', () => {
    expect(detectSeparator('"a;b;c",d')).toBe(',')
  })
})

describe('parseDelimited', () => {
  it('separa headers y filas', () => {
    const { headers, rows } = parseDelimited('a,b\n1,2\n3,4', ',')
    expect(headers).toEqual(['a', 'b'])
    expect(rows).toEqual([['1', '2'], ['3', '4']])
  })
  it('respeta comas y comillas escapadas dentro de un campo', () => {
    const { rows } = parseDelimited('a,b\n"Hola, mundo","dijo ""hey"""', ',')
    expect(rows[0]).toEqual(['Hola, mundo', 'dijo "hey"'])
  })
  it('normaliza CRLF y descarta líneas vacías', () => {
    const { headers, rows } = parseDelimited('a,b\r\n1,2\r\n\r\n', ',')
    expect(headers).toEqual(['a', 'b'])
    expect(rows).toEqual([['1', '2']])
  })
  it('parsea con tab como separador', () => {
    expect(parseDelimited('a\tb\n1\t2', '\t').rows).toEqual([['1', '2']])
  })
  it('un salto de línea dentro de comillas NO parte el registro (notes multilínea)', () => {
    const csv = 'title,notes\n"Estudio X","Llamé al sponsor.\nHablamos el lunes."'
    const { rows } = parseDelimited(csv, ',')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual(['Estudio X', 'Llamé al sponsor.\nHablamos el lunes.'])
  })
})
