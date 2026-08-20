import { describe, it, expect } from 'vitest'
import { actividadFilters, trimestreDe } from './index'
import { applyFilters } from '@/shared/utils/filters'
import { ESTADO } from '@/shared/constants/domain'
import type { Actividad } from '@/features/stratix-mkt/types'
import type { I18nKey } from '@/shared/i18n'

const t = (k: I18nKey) => String(k)
const nombrePorId = { u1: 'Ariana', u2: 'Bruno' }
const DEFS = actividadFilters({ t, nombrePorId })

const acts: Actividad[] = [
  { id: '1', mes: 'Enero', trimestre: 'Q1', estado: ESTADO.PENDIENTE, empresa: 'EMC', responsable_id: 'u1' },
  { id: '2', mes: 'Julio', estado: ESTADO.COMPLETADO, empresa: 'SVN', responsable_id: 'u2' },
  { id: '3', mes: 'Agosto', trimestre: 'Q3', estado: ESTADO.COMPLETADO, empresa: 'EMC', responsable_id: 'u1' },
]
const ids = (rows: Actividad[]) => rows.map(a => a.id)

describe('trimestreDe', () => {
  it('usa el trimestre guardado cuando está', () => {
    expect(trimestreDe(acts[0])).toBe('Q1')
  })
  it('lo deriva del mes cuando falta', () => {
    expect(trimestreDe(acts[1])).toBe('Q3')
  })
  it('devuelve vacío si no hay ni uno ni otro', () => {
    expect(trimestreDe({})).toBe('')
  })
})

describe('actividadFilters', () => {
  it('sin valores no filtra nada', () => {
    expect(applyFilters(acts, DEFS, {})).toHaveLength(3)
  })
  it('el trimestre alcanza a las que solo tienen mes', () => {
    expect(ids(applyFilters(acts, DEFS, { trimestre: 'Q3' }))).toEqual(['2', '3'])
  })
  it('combina filtros en AND', () => {
    expect(ids(applyFilters(acts, DEFS, { estado: ESTADO.COMPLETADO, empresa: 'EMC' }))).toEqual(['3'])
  })
  it('filtra por responsable, que es un uuid', () => {
    expect(ids(applyFilters(acts, DEFS, { responsable_id: 'u2' }))).toEqual(['2'])
  })
})

describe('opciones y etiquetas', () => {
  const byKey = (k: string) => DEFS.find(d => d.key === k)!
  it('el trimestre no ofrece General: eso es "sin filtro"', () => {
    expect(byKey('trimestre').options?.(acts)).toEqual(['Q1', 'Q2', 'Q3', 'Q4'])
  })
  it('el mes ofrece los 12, no solo los que tienen tareas', () => {
    expect(byKey('mes').options?.(acts)).toHaveLength(12)
  })
  it('el responsable se rotula con el nombre, no con el uuid', () => {
    expect(byKey('responsable_id').optionLabel?.('u1')).toBe('Ariana')
  })
  it('el estado se rotula por i18n, no con el canónico en español', () => {
    expect(byKey('estado').optionLabel?.(ESTADO.PENDIENTE)).toBe('stratix.estado.pendiente')
  })
  it('la marca sale de los datos presentes', () => {
    expect(byKey('empresa').options?.(acts)).toEqual(['EMC', 'SVN'])
  })
})
