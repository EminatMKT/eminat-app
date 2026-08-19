import { describe, it, expect } from 'vitest'
import { stageBuckets, specialtyBuckets, phaseBuckets, NO_STAGE, NO_PHASE } from './charts'
import { LEAD_FILTERS } from './filters'
import { applyFilters } from '@/shared/utils/filters'
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

  it('fase: cada barra filtra exactamente lo que cuenta, combinados y legacy incluidos', () => {
    const buckets = phaseBuckets(leads)
    expect(buckets.find(b => b.key === NO_PHASE)?.value).toBe(2) // el 4 (vacía) y el 5 (sin la prop)
    invariante(buckets, 'phase')
  })

  // Decisión del 18/08: un estudio 'Phase 1/Phase 2' cuenta en las DOS barras, porque la
  // pregunta que se hace es "cuántos estudios tenemos en fase 2" y el filtro ya respondía eso
  // por inclusión. Antes la barra contaba el valor exacto y el filtro traía los combinados:
  // la barra decía 7 y los KPIs mostraban 12.
  it('fase: un estudio combinado cuenta en cada una de sus fases', () => {
    const combinados = [
      { id: 'a', phase: 'Phase 1/Phase 2' },
      { id: 'b', phase: 'Phase 2' },
    ] as unknown as Lead[]
    const buckets = phaseBuckets(combinados)
    expect(buckets.find(b => b.key === 'Phase 2')?.value).toBe(2)
    expect(buckets.find(b => b.key === 'Phase 1')?.value).toBe(1)
    expect(buckets.find(b => b.key === 'Phase 1/Phase 2')).toBeUndefined()
  })

  // 'N/A' lleva una barra adentro: partir por '/' lo rompería en 'N' y 'A'.
  it('fase: N/A es una fase entera, no dos', () => {
    const buckets = phaseBuckets([{ id: 'a', phase: 'N/A' }] as unknown as Lead[])
    expect(buckets.map(b => b.key)).toEqual(['N/A'])
  })

  // El Excel de Royner trae la fase como número suelto. Se normaliza al canónico para que caiga
  // en la misma barra que los demás en vez de abrir una barra '2' propia.
  it('fase: el legacy numérico cae en la barra canónica', () => {
    const buckets = phaseBuckets([{ id: 'a', phase: 2 }] as unknown as Lead[])
    expect(buckets.map(b => b.key)).toEqual(['Phase 2'])
  })
})

describe('agrupadores', () => {
  it('trata los espacios en blanco como vacío, igual que la tabla', () => {
    expect(stageBuckets(leads).find(b => b.key === '   ')).toBeUndefined()
  })

  it('conserva las etapas legacy en vez de esconderlas', () => {
    expect(stageBuckets(leads).map(b => b.key)).toContain('Awarded')
  })

  it('la especialidad sin clasificar va última aunque sea la más numerosa', () => {
    const buckets = specialtyBuckets(leads, t)
    expect(buckets[buckets.length - 1].key).toBe('Sin clasificar')
  })
})
