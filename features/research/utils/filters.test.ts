import { describe, it, expect } from 'vitest'
import { LEAD_FILTERS } from './filters'
import { NO_SPECIALTY } from './specialty'
import { applyFilters } from '@/shared/utils/filters'
import type { Lead } from '../types'

const lead = (nct: string, date_added?: string) => ({ id: nct, nct_number: nct, date_added } as Lead)
const leads = [lead('NCT00000111', '2026-08-03'), lead('NCT00000222', '2026-08-10'), lead('NCT00000333')]

const ncts = (values: Record<string, string>) => applyFilters(leads, LEAD_FILTERS, values).map(l => l.nct_number)

describe('filtros de leads (NCT# y rango de carga)', () => {
  it('busca NCT# por fragmento, sin importar mayúsculas ni espacios', () => {
    expect(ncts({ nct: ' nct00000222 ' })).toEqual(['NCT00000222'])
    expect(ncts({ nct: '111' })).toEqual(['NCT00000111'])
  })

  it('acota por rango de fecha de carga, combinando ambos extremos', () => {
    expect(ncts({ addedFrom: '2026-08-05' })).toEqual(['NCT00000222'])
    expect(ncts({ addedTo: '2026-08-05' })).toEqual(['NCT00000111'])
    expect(ncts({ addedFrom: '2026-08-01', addedTo: '2026-08-31' })).toEqual(['NCT00000111', 'NCT00000222'])
  })

  it('deja fuera del rango a los leads sin fecha de carga', () => {
    expect(ncts({ addedFrom: '2000-01-01' })).not.toContain('NCT00000333')
  })
})

// El gráfico "Estudios por especialidad" tiene una barra de "Sin clasificar" (hoy 1 de cada 4
// estudios). Clickearla tiene que poder filtrar esos, y "sin valor" no se expresa con el
// match por igualdad de siempre: string vacío significa "filtro apagado".
describe('filtro de especialidad', () => {
  const byEsp = [
    { id: '1', especialidad: 'Oncología' },
    { id: '2', especialidad: 'Cardiología' },
    { id: '3' },
    { id: '4', especialidad: '' },
  ] as Lead[]
  const ids = (v: string) => applyFilters(byEsp, LEAD_FILTERS, { specialty: v }).map(l => l.id)

  it('filtra por una especialidad del dominio', () => {
    expect(ids('Oncología')).toEqual(['1'])
  })

  it('el centinela de sin clasificar trae los que no tienen ninguna', () => {
    expect(ids(NO_SPECIALTY)).toEqual(['3', '4'])
  })

  it('el centinela está entre las opciones del filtro, si no no se puede elegir a mano', () => {
    const def = LEAD_FILTERS.find(f => f.key === 'specialty')!
    expect(def.options!(byEsp)).toContain(NO_SPECIALTY)
  })
})
