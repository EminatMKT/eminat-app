import { describe, it, expect } from 'vitest'
import { repararMojibake, serialADate, normalizarTelefono, normalizarCaja, normalizarGenero, normalizarChart } from './index'

describe('repararMojibake', () => {
  it('repara el UTF-8 leído como latin-1', () => {
    expect(repararMojibake('PeÃ±a')).toBe('Peña')
    expect(repararMojibake('Bethsabe EstupiÃ±an')).toBe('Bethsabe Estupiñan')
  })
  it('deja intacto lo que ya está bien', () => {
    expect(repararMojibake('Peña')).toBe('Peña')
    expect(repararMojibake('Andrade')).toBe('Andrade')
  })
})

describe('serialADate', () => {
  it('convierte el serial de Excel a fecha local', () => {
    expect(serialADate('39872.0')).toEqual({ valor: '2009-02-28', marcada: false })
  })
  it('marca las fechas futuras en vez de aceptarlas', () => {
    // 61642 es 2068-10-06, una de las cuatro fechas futuras del archivo (error de
    // siglo al tipear). El serial va verificado: cualquier número futuro haría pasar
    // el test igual, así que uno equivocado mentiría sin que nada lo delate.
    expect(serialADate('61642')).toMatchObject({ marcada: true, motivo: 'futura' })
  })
  it('marca la celda vacía sin inventar una fecha', () => {
    expect(serialADate('')).toEqual({ valor: null, marcada: true, motivo: 'sinFecha' })
  })
})

describe('normalizarTelefono', () => {
  it('expande la notación científica y formatea 10 dígitos', () => {
    expect(normalizarTelefono('9.547060773E9')).toEqual({ valor: '(954) 706-0773', marcada: false })
  })
  it('saca el 1 de un 11 dígitos que empieza en 1', () => {
    expect(normalizarTelefono('1.7543678071E10')).toEqual({ valor: '(754) 367-8071', marcada: false })
  })
  it('MARCA los 11 dígitos que NO empiezan en 1 en vez de mutilarlos', () => {
    // 81370956960 es 813-709-5696 con un cero de más. Sacarle el primer dígito daría
    // 1370956960, un teléfono que no es de nadie: el default es marcar, no arreglar.
    expect(normalizarTelefono('8.137095696E10')).toMatchObject({ marcada: true })
    expect(normalizarTelefono('8.137095696E10').valor).not.toBe('(137) 095-6960')
  })
  it('marca los 9 dígitos, el 0.0 y el de 13', () => {
    expect(normalizarTelefono('7.868181E8')).toMatchObject({ marcada: true })
    expect(normalizarTelefono('0.0')).toMatchObject({ marcada: true })
    expect(normalizarTelefono('5.52199E12')).toMatchObject({ marcada: true })
  })
  it('la celda vacía no se marca: no informar un teléfono no es un error', () => {
    expect(normalizarTelefono('')).toEqual({ valor: null, marcada: false })
  })
  it('el whitespace cuenta como vacío, no como basura', () => {
    expect(normalizarTelefono('   ')).toEqual({ valor: null, marcada: false })
  })
  it('MARCA la celda con contenido que no da ningún dígito, en vez de descartarla como vacía', () => {
    expect(normalizarTelefono('N/A')).toEqual({ valor: 'N/A', marcada: true, motivo: 'telefonoInvalido' })
    expect(normalizarTelefono('-')).toEqual({ valor: '-', marcada: true, motivo: 'telefonoInvalido' })
  })
  it('un decimal SIN notación científica no se trunca', () => {
    // soloDigitos() solo debe expandir cuando el crudo trae 'e'/'E' (Excel guardó la columna
    // como número grande). Sin ese guard, Number('754.3678071') igual da un número finito y
    // Math.trunc lo corta en la parte entera -'754'-, mutilando el teléfono en vez de leer sus
    // dígitos.
    expect(normalizarTelefono('754.3678071')).toEqual({ valor: '(754) 367-8071', marcada: false })
  })
})

describe('normalizarCaja', () => {
  it('pasa a Title Case respetando las partículas', () => {
    expect(normalizarCaja('GONZALEZ ESPONDA')).toBe('Gonzalez Esponda')
    expect(normalizarCaja('ardila de delgado')).toBe('Ardila de Delgado')
  })
})

describe('normalizarGenero', () => {
  it('resuelve los tres vocabularios contra el canónico', () => {
    expect(normalizarGenero('M')).toBe('M')
    expect(normalizarGenero('Male')).toBe('M')
    expect(normalizarGenero('Female')).toBe('F')
    expect(normalizarGenero('Femenino')).toBe('F')
  })
  it('devuelve null si no resuelve, para que el import lo pregunte', () => {
    expect(normalizarGenero('Masc.')).toBeNull()
  })
})

describe('normalizarChart', () => {
  it('el Chart# de Excel llega como float y va a entero', () => {
    // Es la CLAVE DE IDENTIDAD de eMedicalPractice: '2.0' y '2' tienen que dar lo mismo
    // o la misma persona entra dos veces.
    expect(normalizarChart('2.0')).toBe('2')
    expect(normalizarChart('1276.0')).toBe('1276')
    expect(normalizarChart('2')).toBe('2')
  })
  it('un valor no numérico no colisiona con otro en el string "NaN": se conserva el crudo', () => {
    expect(normalizarChart('abc')).toBe('abc')
  })
  it('la celda vacía da string vacío, no "NaN"', () => {
    expect(normalizarChart('')).toBe('')
  })
})
