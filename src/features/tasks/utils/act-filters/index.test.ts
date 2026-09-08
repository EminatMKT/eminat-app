import { describe, it, expect } from 'vitest'
import { actividadFilters } from './index'
import { applyFilters } from '@/shared/utils'
import { ESTADO } from '@/shared/constants/domain'
import type { Actividad } from '@/features/tasks/types'
import type { I18nKey } from '@/shared/i18n'

const t = (k: I18nKey) => String(k)
const nombrePorId = { u1: 'Ariana', u2: 'Bruno' }
// Los mapas del área van vacíos: los filtros de acá no los usan y el de área tiene su propio
// bloque más abajo.
const base = { t, nombrePorId, departamentoPorResponsable: {}, nombreDepartamento: {} }
const DEFS = actividadFilters(base)

const acts: Actividad[] = [
  { id: '1', fecha_inicio: '2026-01-15', estado: ESTADO.PENDIENTE, empresa: 'EMC', responsable_id: 'u1' },
  { id: '2', fecha_inicio: '2026-07-10', estado: ESTADO.COMPLETADO, empresa: 'SVN', responsable_id: 'u2' },
  { id: '3', fecha_inicio: '2026-08-20', estado: ESTADO.COMPLETADO, empresa: 'EMC', responsable_id: 'u1' },
]
const ids = (rows: Actividad[]) => rows.map(a => a.id)

describe('filtros de fecha', () => {
  const dosFechas = [
    { id: 'a', fecha_inicio: '2026-03-17', fecha_entrega: '2026-06-30' },
    { id: 'b', fecha_inicio: '2027-03-02', fecha_entrega: '2026-03-17' },
  ]
  const byKey = (k: string) => DEFS.find(d => d.key === k)!

  it('acota por un tramo que no cae en los cortes del calendario', () => {
    // Lo que los dos desplegables no sabían pedir: del 15 de marzo al 10 de abril.
    expect(byKey('fecha_inicio').match(dosFechas[0], '2026-03-15..2026-04-10')).toBe(true)
    expect(byKey('fecha_inicio').match(dosFechas[0], '2026-03-18..2026-04-10')).toBe(false)
  })
  it('el mismo mes de dos años son dos tramos distintos', () => {
    expect(byKey('fecha_inicio').match(dosFechas[0], '2026-03-01..2026-03-31')).toBe(true)
    expect(byKey('fecha_inicio').match(dosFechas[1], '2026-03-01..2026-03-31')).toBe(false)
    expect(byKey('fecha_inicio').match(dosFechas[1], '2027-03-01..2027-03-31')).toBe(true)
  })
  // Las dos columnas son dos preguntas: el mismo tramo devuelve filas distintas según cuál se
  // pregunte, que es exactamente por lo que un solo filtro rotulado «Fecha» no alcanzaba.
  it('inicio y entrega filtran columnas distintas', () => {
    const marzo = '2026-03-01..2026-03-31'
    expect(ids(applyFilters(dosFechas, DEFS, { fecha_inicio: marzo }))).toEqual(['a'])
    expect(ids(applyFilters(dosFechas, DEFS, { fecha_entrega: marzo }))).toEqual(['b'])
  })
  it('no ofrecen opciones: un rango no es un desplegable', () => {
    expect(byKey('fecha_entrega').options).toBeUndefined()
  })
})

describe('actividadFilters', () => {
  it('sin valores no filtra nada', () => {
    expect(applyFilters(acts, DEFS, {})).toHaveLength(3)
  })
  it('el rango agrupa lo que cae adentro, sin importar el corte', () => {
    expect(ids(applyFilters(acts, DEFS, { fecha_inicio: '2026-07-01..2026-09-30' }))).toEqual(['2', '3'])
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

describe('filtro de área', () => {
  const deps = {
    ...base,
    departamentoPorResponsable: { u1: 'd-mkt', u2: 'd-med' },
    nombreDepartamento: { 'd-mkt': 'Marketing', 'd-med': 'Medical' },
    departamentoPropio: 'd-mkt',
  }
  const def = () => actividadFilters(deps).find(d => d.key === 'departamento')!

  it('arranca en el área de quien mira', () => {
    expect(def().defaultValue).toBe('d-mkt')
  })

  it('el match navega responsable → departamento', () => {
    expect(def().match({ responsable_id: 'u1' }, 'd-mkt')).toBe(true)
    expect(def().match({ responsable_id: 'u2' }, 'd-mkt')).toBe(false)
  })

  // Con la fase 0 a medias hay gente sin equipo. El filtro las deja fuera; lo que no puede
  // hacer es tirar una excepción y llevarse el tablero.
  it('un responsable sin departamento no matchea y no revienta', () => {
    expect(def().match({ responsable_id: 'u9' }, 'd-mkt')).toBe(false)
    expect(def().match({}, 'd-mkt')).toBe(false)
  })

  it('rotula con el nombre del departamento, no con su uuid', () => {
    expect(def().optionLabel?.('d-med')).toBe('Medical')
    expect(def().optionLabel?.('d-x')).toBe('—')
  })

  // Sin departamento propio (una persona sin equipo, o la fase 0 sin hacer) el filtro existe
  // igual pero abre en «Todas las áreas»: es mejor ver todo que ver nada.
  it('sin área propia no hay default', () => {
    const sinPropia = actividadFilters({ ...deps, departamentoPropio: undefined })
    expect(sinPropia.find(d => d.key === 'departamento')!.defaultValue).toBeUndefined()
  })
})
