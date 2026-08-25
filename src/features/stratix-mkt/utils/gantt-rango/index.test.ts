import { describe, it, expect } from 'vitest'
import { rangoGantt, fechaEnRango, rangoAnios, limitesFecha, MAX_DIAS } from './index'

const hoy = new Date('2026-08-24T12:00:00Z')

describe('rangoGantt', () => {
  it('usa el rango de las fechas cargadas', () => {
    const r = rangoGantt(['2026-08-01', '2026-08-10'], hoy)
    expect(r.fechaMin.toISOString().slice(0, 10)).toBe('2026-08-01')
    expect(r.totalDias).toBe(10)
    expect(r.descartadas).toBe(0)
  })

  // La regresión: 6 filas con año 0206 hacían totalDias = 664.781.
  it('descarta un año absurdo en vez de estirar el eje hasta el año 206', () => {
    const r = rangoGantt(['0206-03-23', '2026-04-01', '2026-04-30'], hoy)
    expect(r.fechaMin.toISOString().slice(0, 10)).toBe('2026-04-01')
    expect(r.totalDias).toBe(30)
    expect(r.descartadas).toBe(1)
  })

  it('descarta null, vacío y texto no parseable', () => {
    const r = rangoGantt([null, undefined, '', 'mañana', '2026-08-01'], hoy)
    expect(r.descartadas).toBe(4)
    expect(r.totalDias).toBe(MIN_DIAS_ESPERADO)
  })

  it('sin ninguna fecha válida, arranca en hoy y muestra 30 días', () => {
    const r = rangoGantt([null, '0206-03-23'], hoy)
    expect(r.fechaMin.toISOString().slice(0, 10)).toBe('2026-08-24')
    expect(r.totalDias).toBe(31)
    expect(r.descartadas).toBe(2)
  })

  it('nunca devuelve menos de 7 días', () => {
    expect(rangoGantt(['2026-08-01', '2026-08-02'], hoy).totalDias).toBe(7)
  })

  // Red de seguridad independiente del filtro de años: aunque el filtro deje pasar
  // algo, el eje tiene un techo duro.
  it('acota el total de días al techo duro', () => {
    const r = rangoGantt(['2022-01-01', '2030-12-31'], hoy)
    expect(r.totalDias).toBe(MAX_DIAS)
  })
})

const MIN_DIAS_ESPERADO = 7

describe('fechaEnRango', () => {
  const hoy = new Date('2026-08-24T12:00:00Z')

  it('acepta una fecha del año en curso', () => {
    expect(fechaEnRango('2026-03-23', hoy)).toBe(true)
  })
  it('rechaza el año 206 (el typo que colgaba el Gantt)', () => {
    expect(fechaEnRango('0206-03-23', hoy)).toBe(false)
  })
  it('rechaza null, vacío y texto no parseable', () => {
    expect(fechaEnRango(null, hoy)).toBe(false)
    expect(fechaEnRango('', hoy)).toBe(false)
    expect(fechaEnRango('mañana', hoy)).toBe(false)
  })
  it('acepta los bordes de la ventana y rechaza lo de afuera', () => {
    expect(fechaEnRango('2021-01-01', hoy)).toBe(true)
    expect(fechaEnRango('2031-12-31', hoy)).toBe(true)
    expect(fechaEnRango('2020-12-31', hoy)).toBe(false)
    expect(fechaEnRango('2032-01-01', hoy)).toBe(false)
  })
})

describe('rangoAnios', () => {
  it('devuelve la ventana que la UI le muestra al usuario', () => {
    expect(rangoAnios(new Date('2026-08-24T12:00:00Z'))).toEqual({ min: 2021, max: 2031 })
  })
})

describe('limitesFecha', () => {
  it('da min/max en el formato de <input type="date">', () => {
    expect(limitesFecha(new Date('2026-08-24T12:00:00Z'))).toEqual({ min: '2021-01-01', max: '2031-12-31' })
  })
  // Lo que esto protege: que el form no acepte una fecha que el Gantt luego esconde.
  it('los bordes que el input acepta son fechas que el Gantt muestra', () => {
    const hoy = new Date('2026-08-24T12:00:00Z')
    const { min, max } = limitesFecha(hoy)
    expect(fechaEnRango(min, hoy)).toBe(true)
    expect(fechaEnRango(max, hoy)).toBe(true)
  })
})
