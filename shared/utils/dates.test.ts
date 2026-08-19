import { describe, it, expect } from 'vitest'
import { localDate, localMonth } from './dates'

// Los dos casos son las dos puntas del día, y entre ambos atrapan el bug en cualquier zona:
// con `toISOString()` la noche se adelanta un día en las zonas detrás de UTC (la nuestra, UTC-4)
// y la madrugada se atrasa uno en las de adelante. Con hora local, ninguno se mueve.
describe('localDate', () => {
  it('de noche devuelve el día local, no el de UTC', () => {
    expect(localDate(new Date(2026, 7, 19, 21, 30))).toBe('2026-08-19')
  })

  it('de madrugada devuelve el día local, no el de UTC', () => {
    expect(localDate(new Date(2026, 7, 19, 0, 30))).toBe('2026-08-19')
  })

  it('cruza fin de mes sin adelantarse', () => {
    expect(localDate(new Date(2026, 7, 31, 22, 0))).toBe('2026-08-31')
    expect(localMonth(new Date(2026, 7, 31, 22, 0))).toBe('2026-08')
  })
})
