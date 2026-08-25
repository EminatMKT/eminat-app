// centinela-exime: archivo-extenso@1 — son casos de prueba, no lógica: cada `it` es un
// escenario y partirlos en archivos esconde qué está cubierto y qué no.
import { describe, it, expect } from 'vitest'
import { camposDeActividad, rastroDeActividad, fechaLarga } from './index'
import type { I18nKey } from '@/shared/i18n'

// La clave cruda alcanza: lo que se prueba es qué campo sale y con qué valor, no la traducción.
const t = (k: I18nKey) => k as string
const deps = { t, locale: 'es-ES', miembrosPorId: { u1: 'Ana Sinequipo', u2: 'Beto Medico' } }

type Act = Parameters<typeof camposDeActividad>[0]
const todos = (a: Act) => camposDeActividad(a, deps).flatMap(g => g.campos)
const buscar = (a: Act, label: string) => todos(a).find(c => c.label === label)

describe('camposDeActividad', () => {
  it('agrupa los campos en cinco secciones con nombre', () => {
    expect(camposDeActividad({}, deps).map(g => g.titulo)).toEqual([
      'stratix.detail.grupoAsignacion',
      'stratix.detail.grupoPeriodo',
      'stratix.detail.grupoEsfuerzo',
      'stratix.detail.grupoFechas',
      'stratix.detail.grupoAprobacion',
    ])
  })

  it('resuelve los ids de persona contra el mapa y cae a — si no está', () => {
    const a = { responsable_id: 'u1', solicitante_id: 'u9' }
    expect(buscar(a, 'stratix.col.assignee')?.value).toBe('Ana Sinequipo')
    expect(buscar(a, 'stratix.detail.requestedBy')?.value).toBe('—')
  })

  it('marca `vacio` el campo sin dato, para que la ficha lo atenúe en vez de darle peso', () => {
    const a = { responsable_id: 'u1' }
    expect(buscar(a, 'stratix.col.assignee')?.vacio).toBe(false)
    expect(buscar(a, 'stratix.detail.week')?.vacio).toBe(true)
    expect(buscar(a, 'stratix.detail.approvedBy')?.vacio).toBe(true)
  })

  it('deriva el trimestre del mes cuando la fila no lo trae, y el guardado gana', () => {
    expect(buscar({ mes: 'Agosto' }, 'stratix.detail.quarter')?.value).toBe('Q3')
    expect(buscar({ mes: 'Agosto', trimestre: 'Q1' }, 'stratix.detail.quarter')?.value).toBe('Q1')
  })

  it('verificado NO es booleano: muestra su valor, no "sí"', () => {
    expect(buscar({ verificado: 'Pendiente' }, 'stratix.detail.verified')?.value).toBe('stratix.verificado.pendiente')
    expect(buscar({ verificado: 'Aprobado' }, 'stratix.detail.verified')?.value).toBe('stratix.verificado.aprobado')
  })

  it('sin horas ni días muestra 0, no vacío', () => {
    expect(buscar({}, 'stratix.detail.estHours')?.value).toBe('0h')
    expect(buscar({}, 'stratix.detail.prodDays')?.value).toBe('0')
  })

  it('bloqueada usa sí/no porque ahí sí es booleano', () => {
    expect(buscar({ bloqueada: true }, 'stratix.detail.blocked')?.value).toBe('common.yes')
    expect(buscar({}, 'stratix.detail.blocked')?.value).toBe('common.no')
  })

  it('devuelve las trece filas siempre, aunque la actividad esté vacía', () => {
    expect(todos({})).toHaveLength(13)
  })
})

describe('rastroDeActividad', () => {
  it('junta creación y última edición en una sola línea de pie', () => {
    const linea = rastroDeActividad({ created_at: '2026-08-24T10:00:00Z' }, deps)
    expect(linea).toContain('stratix.detail.created')
    expect(linea).toContain('stratix.detail.updated')
    expect(linea).toContain('·')
  })
})

describe('fechaLarga', () => {
  it('una fecha YYYY-MM-DD se lee en hora local, no en UTC', () => {
    // En UTC-4, `new Date('2026-07-30')` cae el 29 a las 20:00 y se mostraría "miércoles 29".
    expect(fechaLarga('2026-07-30', 'es-ES', t)).toContain('30')
    expect(fechaLarga('2026-07-30', 'es-ES', t)).toContain('julio')
  })

  it('sin fecha devuelve la clave de "sin fecha", no una fecha inválida', () => {
    expect(fechaLarga(undefined, 'es-ES', t)).toBe('stratix.detail.noDate')
    expect(fechaLarga('', 'es-ES', t)).toBe('stratix.detail.noDate')
  })
})
