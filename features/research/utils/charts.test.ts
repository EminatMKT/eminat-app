import { describe, it, expect } from 'vitest'
import { stageBuckets, specialtyBuckets, phaseBuckets, NO_STAGE, NO_PHASE } from './charts'
import { LEAD_FILTERS } from './filters'
import { applyFilters } from '@/shared/lib/filters'
import type { Lead } from '../types'

// LA invariante del cross-filter: cada barra es clickeable y su `key` va al filtro, así que
// filtrar por el valor de una barra tiene que devolver EXACTAMENTE los leads que esa barra
// contó. Si no, la pantalla se contradice sola: el gráfico dice 14 y los KPIs dicen otra cosa.
//
// Es el test que faltaba. Sin él, el agrupador y el `match` se desalinearon en silencio: la
// barra "Sin fase" filtraba a CERO (porque ''.includes('Sin fase') es false) y la de "Sin
// etapa" igual.
const leads = [
  { id: '1', stage: 'Nuevo', phase: 'Phase 3', especialidad: 'Oncología' },
  { id: '2', stage: 'Nuevo', phase: 'Phase 3' },
  { id: '3', stage: 'Ganado', phase: 'N/A', especialidad: 'Cardiología' },
  { id: '4', phase: '', especialidad: 'Oncología' },        // sin etapa y sin fase
  { id: '5', stage: '   ', especialidad: '' },              // solo espacios: cuenta como vacío
  { id: '6', stage: 'Awarded', phase: 2 },                  // legacy: etapa vieja y fase numérica
] as unknown as Lead[]

const t = ((k: string) => k) as any

// Filtrar por el key de la barra devuelve tantos leads como dice la barra.
const invariante = (buckets: { key: string; value: number }[], filterKey: string) => {
  for (const b of buckets) {
    const encontrados = applyFilters(leads, LEAD_FILTERS, { [filterKey]: b.key }).length
    expect(`${b.key}: ${encontrados}`).toBe(`${b.key}: ${b.value}`)
  }
}

describe('invariante barra ↔ filtro', () => {
  it('etapa: cada barra filtra exactamente lo que cuenta, incluida "Sin etapa"', () => {
    const buckets = stageBuckets(leads)
    expect(buckets.find(b => b.key === NO_STAGE)?.value).toBe(2) // el 4 y el 5
    invariante(buckets, 'stage')
  })

  it('especialidad: cada barra filtra exactamente lo que cuenta, incluida "Sin clasificar"', () => {
    invariante(specialtyBuckets(leads, t), 'specialty')
  })

  it('fase: la barra "Sin fase" filtra los que no tienen fase, no cero', () => {
    const buckets = phaseBuckets(leads)
    const sinFase = buckets.find(b => b.key === NO_PHASE)!
    expect(sinFase.value).toBe(2) // el 4 (cadena vacía) y el 5 (sin la propiedad)
    expect(applyFilters(leads, LEAD_FILTERS, { phase: NO_PHASE }).length).toBe(sinFase.value)
  })
})

describe('agrupadores', () => {
  it('trata los espacios en blanco como vacío, igual que la tabla', () => {
    expect(stageBuckets(leads).find(b => b.key === '   ')).toBeUndefined()
  })

  it('conserva los valores legacy en vez de esconderlos', () => {
    expect(stageBuckets(leads).map(b => b.key)).toContain('Awarded')
    expect(phaseBuckets(leads).map(b => b.key)).toContain('2')
  })

  it('la especialidad sin clasificar va última aunque sea la más numerosa', () => {
    const buckets = specialtyBuckets(leads, t)
    expect(buckets[buckets.length - 1].key).toBe('Sin clasificar')
  })
})
