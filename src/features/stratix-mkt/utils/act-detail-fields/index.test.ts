// centinela-exime: archivo-extenso@2 — son casos de prueba, no lógica: cada `it` es un
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
  it('agrupa los campos en cuatro secciones con nombre', () => {
    expect(camposDeActividad({}, deps).map(g => g.titulo)).toEqual([
      'stratix.detail.grupoAsignacion',
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

  // Las dos fechas van juntas y en el mismo formato. `Inicio` tenía su propio apartado con un
  // Trimestre calculado al lado; los dos se fueron.
  it('el inicio se lee con la fecha de entrega, no en un grupo aparte', () => {
    const fechas = camposDeActividad({ fecha_inicio: '2026-03-17' }, deps)
      .find(g => g.titulo === 'stratix.detail.grupoFechas')!
    expect(fechas.campos.map(c => c.label)).toEqual([
      'stratix.detail.start', 'stratix.col.due',
    ])
    expect(fechas.campos[0].value).toMatch(/2026/)
  })

  // El grupo muestra lo que el formulario escribe, ni un campo más. `Pedida para` leía
  // `fecha_requerida`, que sólo tienen las filas importadas del Sheet: en toda tarjeta creada
  // desde la app decía "Sin fecha".
  it('no muestra `Pedida para`: ningún formulario escribe esa columna', () => {
    const fechas = camposDeActividad({ fecha_requerida: '2026-03-10' }, deps)
      .find(g => g.titulo === 'stratix.detail.grupoFechas')!
    expect(fechas.campos.map(c => c.label)).not.toContain('stratix.detail.requiredDate')
  })

  it('sin fecha de inicio el campo se marca vacío, no inventa un valor', () => {
    expect(buscar({}, 'stratix.detail.start')?.vacio).toBe(true)
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

  // Eran trece: el grupo PERÍODO tenía Mes, Trimestre y Semana. `semana` se fue con su columna,
  // `mes` lo reemplazó `fecha_inicio` —que ahora vive con la otra fecha— y el trimestre se fue
  // porque repetía, en otro formato, lo que la fecha de al lado ya decía. La décima en irse fue
  // `Pedida para`, que ningún formulario escribía.
  it('devuelve las once filas siempre, aunque la actividad esté vacía', () => {
    expect(todos({})).toHaveLength(11)
  })

  it('muestra el nombre de quien cargó la tarea', () => {
    const creada = buscar({ responsable_id: 'u1', created_by_id: 'u2' }, 'stratix.detail.createdBy')
    expect(creada?.value).toBe('Beto Medico')
    expect(creada?.vacio).toBe(false)
  })

  // Las filas anteriores a la columna no tienen creador y nunca lo van a tener. El campo existe
  // igual —que no se sepa ES información— pero atenuado, como el resto de los vacíos.
  it('muestra «—» atenuado cuando no hay creador', () => {
    const creada = buscar({ responsable_id: 'u1' }, 'stratix.detail.createdBy')
    expect(creada?.value).toBe('—')
    expect(creada?.vacio).toBe(true)
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

