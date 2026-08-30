import { describe, it, expect } from 'vitest'
import { fechaCorta } from './index'

// Va en su propia suite porque prueba la conversión INVERSA a `localDate`: de una columna
// `date` de Postgres al texto que lee una persona. El bug es el mismo de siempre, al revés.
describe('fechaCorta', () => {
  it('formatea en el idioma que se le pasa', () => {
    expect(fechaCorta('2026-08-29', 'es-EC')).toBe('29 ago 2026')
    expect(fechaCorta('2026-08-29', 'en-US')).toBe('Aug 29, 2026')
  })

  // ÉSTE es el motivo de partir el string a mano. `new Date('2026-08-29')` lo interpreta como
  // medianoche UTC, así que en un huso negativo se imprime 28/8. Comprobado en node.
  //
  // El segundo `expect` sólo es cierto en un huso NEGATIVO —es la mitad del test que describe el
  // bug, no la que describe el arreglo—, y por eso `pnpm test` fija `TZ=America/Guayaquil`: el
  // runner de CI corre en UTC, ahí `new Date` no retrocede y este assert daba 29/8. Falló en el
  // CI del PR #58 después de pasar en verde en local, que es la peor forma de descubrirlo.
  it('NO se corre un día hacia atrás, que es lo que hace new Date(string)', () => {
    expect(fechaCorta('2026-08-29', 'es-EC')).toContain('29')
    expect(new Date('2026-08-29').toLocaleDateString('es-EC')).toBe('28/8/2026')
  })

  it('el primero de mes no se va al mes anterior', () => {
    expect(fechaCorta('2026-01-01', 'es-EC')).toBe('01 ene 2026')
  })

  // Una fecha puede llegar vacía o rota desde una fila incompleta: se muestra algo, no "Invalid
  // Date" ni una excepción que tumbe la fila entera del listado.
  it('una fecha vacía o rota no rompe', () => {
    expect(fechaCorta('', 'es-EC')).toBe('—')
    expect(fechaCorta('no-es-fecha', 'es-EC')).toBe('no-es-fecha')
  })
})
