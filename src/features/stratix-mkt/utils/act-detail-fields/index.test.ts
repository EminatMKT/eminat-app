// centinela-exime: archivo-extenso@2 — son casos de prueba, no lógica: cada `it` es un
// escenario y partirlos en archivos esconde qué está cubierto y qué no.
import { describe, it, expect } from 'vitest'
import { camposDeActividad, rastroDeActividad, fechaLarga } from './index'
import { grupoPeriodo } from './grupos/periodo'
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
    expect(buscar(a, 'stratix.detail.start')?.vacio).toBe(true)
    expect(buscar(a, 'stratix.detail.approvedBy')?.vacio).toBe(true)
  })

  // El trimestre se DERIVA de la fecha; ya no hay columna que pueda contradecirla. Antes ganaba
  // la guardada, y por eso 45 filas de marzo se mostraban Q2.
  it('el trimestre sale de la fecha, no de la columna', () => {
    expect(buscar({ fecha_inicio: '2026-08-17' }, 'stratix.detail.quarter')?.value).toBe('Q3')
    expect(buscar({ fecha_inicio: '2026-03-17', trimestre: 'Q2' }, 'stratix.detail.quarter')?.value).toBe('Q1')
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

  // Doce y no trece: el grupo de período pasó de tres campos (Mes, Trimestre, Semana) a dos
  // (Inicio, Trimestre). `semana` se fue con su columna.
  it('devuelve las doce filas siempre, aunque la actividad esté vacía', () => {
    expect(todos({})).toHaveLength(12)
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

describe('grupoPeriodo', () => {
  it('muestra la fecha de inicio y el trimestre derivado', () => {
    const g = grupoPeriodo({ fecha_inicio: '2026-03-17' }, deps)
    expect(g.campos).toHaveLength(2)
    expect(g.campos[0].value).toMatch(/2026/)
    // Marzo es Q1. La columna decía Q2 en 45 filas.
    expect(g.campos[1].value).toBe('Q1')
  })

  // El fallback `|| 'Q1'` que había acá INVENTABA un trimestre para una fila sin mes, y ese dato
  // después se sumaba.
  it('sin fecha, los dos campos se marcan vacíos en vez de inventar un Q1', () => {
    const g = grupoPeriodo({ fecha_inicio: null }, deps)
    expect(g.campos.every(c => c.vacio)).toBe(true)
  })
})
