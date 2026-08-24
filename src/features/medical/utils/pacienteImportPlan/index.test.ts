import { describe, it, expect } from 'vitest'
import {
  fuenteDeHoja, indexPorClave, buildPacienteImportPlan, detectPacienteAnomalies,
  pacienteEntranteDe, fuenteEscrituraDe, contactosDe,
} from './index'
import { claveOrigen } from '../pacienteIdentity'
import { guessMapping } from '../pacienteFields'
import type { PacienteFuente } from '@/features/medical/types'
import type { Identificable } from '../pacienteIdentity'
import type { SanitizeIssue } from '@/shared/import'

// mapping usado en casi todos los casos: una fila cruda con nombre en un solo campo (ECW /
// eClinPro), fecha de nacimiento, género, teléfono, una columna sin mapear (donde vivía el viejo
// `telefono_alt`: ya no existe, `telefono` acumula solo — ver `MAPPING_2TEL` más abajo para el
// caso de dos columnas de teléfono) y email.
const MAPPING = ['nombre_crudo', 'fecha_nacimiento', 'genero', 'telefono', null, 'email']

describe('fuenteDeHoja', () => {
  it('reconoce las tres hojas del archivo real por su nombre', () => {
    expect(fuenteDeHoja('eClinicalWorks')).toBe('ecw')
    expect(fuenteDeHoja('eClinPro')).toBe('eclinpro')
    expect(fuenteDeHoja('eMedicalPractice')).toBe('emed')
  })

  it('no adivina una fuente para una hoja que no la nombra', () => {
    expect(fuenteDeHoja('Hoja1')).toBeNull()
  })
})

describe('indexPorClave', () => {
  it('filtra por fuente y preserva la tumba (paciente_id null)', () => {
    const fuentes: PacienteFuente[] = [
      { paciente_id: 'p1', fuente: 'ecw', clave_origen: 'a', nombre_origen: null, dob_origen: null, ref_externa: null, importado_at: '' },
      { paciente_id: null, fuente: 'ecw', clave_origen: 'b', nombre_origen: null, dob_origen: null, ref_externa: null, importado_at: '' },
      { paciente_id: 'p2', fuente: 'eclinpro', clave_origen: 'a', nombre_origen: null, dob_origen: null, ref_externa: null, importado_at: '' },
    ]
    const idx = indexPorClave('ecw', fuentes)
    expect(idx.get('a')).toBe('p1')
    expect(idx.get('b')).toBeNull()
    expect(idx.has('a')).toBe(true)
    // La clave 'a' de eclinpro no cuenta para el índice de ecw.
    expect(idx.size).toBe(2)
  })
})

describe('buildPacienteImportPlan', () => {
  it('sin fuente reconocida no procesa ninguna fila, y el estado lo distingue de un archivo vacío', () => {
    const sinFuente = buildPacienteImportPlan({
      rows: [['PEREZ,JUAN', '39872', 'M', '7541234567', '', 'juan@x.com']],
      mapping: MAPPING, dupMode: 'update', valueMap: {}, fuente: null,
      existentes: new Map(), pacientes: [],
    })
    expect(sinFuente.toInsert).toHaveLength(0)
    expect(sinFuente.estado).toBe('fuenteDesconocida')

    // Mismo plan vacío en shape (`toInsert: []`), pero con la fuente reconocida y CERO filas
    // de verdad: sin `estado` no hay forma de distinguir "no sé qué es esto" de "esto es
    // válido y no traía nada" — son problemas opuestos y antes devolvían exactamente lo mismo.
    const archivoVacio = buildPacienteImportPlan({
      rows: [], mapping: MAPPING, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes: new Map(), pacientes: [],
    })
    expect(archivoVacio.toInsert).toHaveLength(0)
    expect(archivoVacio.estado).toBe('ok')
  })

  it('arma una fila nueva con el nombre parseado, la fecha resuelta y el teléfono formateado', () => {
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,JUAN', '39872', 'M', '7541234567', '', 'juan@x.com']],
      mapping: MAPPING, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes: new Map(), pacientes: [],
    })
    expect(plan.toInsert).toHaveLength(1)
    const v = plan.toInsert[0]
    expect(v.nombre).toBe('Juan')
    expect(v.apellido).toBe('Perez')
    expect(v.fecha_nacimiento).toBe('2009-02-28')
    expect(v.genero).toBe('M')
    // `telefono` es un campo `multi` (ver `pacienteFields`): `values.telefono` es SIEMPRE un
    // array, aunque el archivo solo traiga una columna. El principal lo resuelve
    // `pacienteEntranteDe` -el caso de dos columnas de teléfono vive en
    // `describe('varias columnas de telefono')`, más abajo.
    expect(pacienteEntranteDe(v).telefono).toBe('(754) 123-4567')
  })

  it('una fecha ISO editada en el paso 4 no se reinterpreta como serial (coerce)', () => {
    // La otra mitad del Bug A: sin el guard de `interpretarDob`, Number('2009-02-28') es NaN y
    // `serialADate` la marca 'sinFecha' -la corrección del usuario a mano se perdería.
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,JUAN', '2009-02-28', 'M', '', '', '']],
      mapping: MAPPING, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes: new Map(), pacientes: [],
    })
    expect(plan.toInsert[0].fecha_nacimiento).toBe('2009-02-28')
  })

  it('BUG A: una fecha corregida a ISO en el paso 4 SÍ genera candidato de fusión (camposParaCandidato)', () => {
    // Antes del fix, `camposParaCandidato` llamaba `serialADate` sin el guard ISO:
    // `serialADate('2009-02-28').valor` da null, `candidatos()` descarta sin fecha_nacimiento,
    // y la fila entraba como paciente NUEVO -mientras el valor escrito sí usaba la fecha
    // corregida-, duplicando el paciente en silencio.
    const pacientes: Identificable[] = [
      { id: 'p1', nombre: 'Juan', apellido: 'Perez', fecha_nacimiento: '2009-02-28', telefono: null, email: null },
    ]
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,JUAN', '2009-02-28', '', '', '', '']],
      mapping: MAPPING, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes: new Map(), pacientes,
    })
    expect(plan.toInsert).toHaveLength(0)
    expect(plan.toMerge).toHaveLength(1)
    expect(plan.toMerge[0].candidatos).toEqual([{ nivel: 'exacta', id: 'p1' }])
  })

  it('una clave ya existente actualiza en vez de insertar', () => {
    const clave = claveOrigen('ecw', { nombreCrudo: 'PEREZ,JUAN', dobCrudo: '39872' })
    const existentes = new Map([[clave, 'uuid-1']])
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,JUAN', '39872', '', '', '', '']],
      mapping: MAPPING, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes, pacientes: [],
    })
    expect(plan.toInsert).toHaveLength(0)
    expect(plan.toUpdate).toEqual([{ id: 'uuid-1', values: expect.objectContaining({ nombre: 'Juan' }) }])
  })

  it('una tumba (paciente_id null) no se recrea', () => {
    const clave = claveOrigen('ecw', { nombreCrudo: 'PEREZ,JUAN', dobCrudo: '39872' })
    const existentes = new Map([[clave, null]])
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,JUAN', '39872', '', '', '', '']],
      mapping: MAPPING, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes, pacientes: [],
    })
    expect(plan.toInsert).toHaveLength(0)
    expect(plan.toUpdate).toHaveLength(0)
    expect(plan.tumbas).toBe(1)
  })

  it('dos filas idénticas del mismo archivo se colapsan en una y se cuentan como repetida', () => {
    const fila = ['PEREZ,JUAN', '39872', '', '', '', '']
    const plan = buildPacienteImportPlan({
      rows: [fila, [...fila]],
      mapping: MAPPING, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes: new Map(), pacientes: [],
    })
    expect(plan.toInsert).toHaveLength(1)
    expect(plan.repetidas).toBe(1)
  })

  it('encuentra un candidato de fusión exacto contra un paciente ya cargado, aunque venga de otra fuente', () => {
    const pacientes: Identificable[] = [
      { id: 'p1', nombre: 'Juan', apellido: 'Perez', fecha_nacimiento: '2009-02-28', telefono: null, email: null },
    ]
    // eclinpro, con separador " - ": misma persona, otra fuente → sin match directo por clave,
    // pero el núcleo nombre+apellido y la fecha coinciden.
    const plan = buildPacienteImportPlan({
      rows: [['Juan - Perez', '39872', '', '', '', '']],
      mapping: MAPPING, dupMode: 'update', valueMap: {}, fuente: 'eclinpro',
      existentes: new Map(), pacientes,
    })
    expect(plan.toInsert).toHaveLength(0)
    expect(plan.toMerge).toHaveLength(1)
    expect(plan.toMerge[0].preMarcado).toBe(true)
    expect(plan.toMerge[0].candidatos).toEqual([{ nivel: 'exacta', id: 'p1' }])
  })

  it('dupMode "skip" no actualiza las filas que ya matchean por clave', () => {
    const clave = claveOrigen('ecw', { nombreCrudo: 'PEREZ,JUAN', dobCrudo: '39872' })
    const existentes = new Map([[clave, 'uuid-1']])
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,JUAN', '39872', '', '', '', '']],
      mapping: MAPPING, dupMode: 'skip', valueMap: {}, fuente: 'ecw',
      existentes, pacientes: [],
    })
    expect(plan.toUpdate).toHaveLength(0)
    expect(plan.skipped).toBe(1)
  })
})

describe('detectPacienteAnomalies', () => {
  // El resto de estos tests asume fuente reconocida (`estado: 'ok'`) — este helper solo
  // destapa `issues` sin repetir el narrowing del discriminante en cada caso; el narrowing en
  // sí, y el caso `'fuenteDesconocida'`, los cubre el primer test.
  function issuesOf(r: ReturnType<typeof detectPacienteAnomalies>): SanitizeIssue[] {
    return r.estado === 'ok' ? r.issues : []
  }

  it('sin fuente reconocida no puede evaluar nada, y el estado lo distingue de haber evaluado y no encontrado nada', () => {
    const sinFuente = detectPacienteAnomalies(null, [['x', '', '', '', '', '']], MAPPING)
    expect(sinFuente.estado).toBe('fuenteDesconocida')
    expect(issuesOf(sinFuente)).toEqual([])

    // Mismo `issuesOf` vacío, pero con la fuente reconocida y una fila limpia: antes de
    // `estado` los dos casos devolvían exactamente el mismo `[]`.
    const limpio = detectPacienteAnomalies('ecw', [['Perez,Juan', '39872', '', '7541234567', '', '']], MAPPING)
    expect(limpio.estado).toBe('ok')
    expect(issuesOf(limpio)).toEqual([])
  })

  it('marca el mojibake en el nombre', () => {
    const issues = issuesOf(detectPacienteAnomalies('ecw', [['PeÃ±a,Juan', '39872', '', '', '', '']], MAPPING))
    expect(issues.some(i => i.messageKey === 'med.import.anomaly.mojibake')).toBe(true)
  })

  it('marca la fecha futura', () => {
    const issues = issuesOf(detectPacienteAnomalies('ecw', [['Perez,Juan', '60000', '', '', '', '']], MAPPING))
    expect(issues.some(i => i.messageKey === 'med.import.anomaly.futureDob')).toBe(true)
  })

  it('marca la fecha faltante', () => {
    const issues = issuesOf(detectPacienteAnomalies('ecw', [['Perez,Juan', '', '', '', '', '']], MAPPING))
    expect(issues.some(i => i.messageKey === 'med.import.anomaly.missingDob')).toBe(true)
  })

  it('marca un teléfono que no da 10 dígitos', () => {
    const issues = issuesOf(detectPacienteAnomalies('ecw', [['Perez,Juan', '39872', '', '123', '', '']], MAPPING))
    expect(issues.some(i => i.messageKey === 'med.import.anomaly.invalidPhone' && i.colIndex === 3)).toBe(true)
  })

  it('marca una fila que no parece un paciente sin ser una lista de una cadena', () => {
    const issues = issuesOf(detectPacienteAnomalies('ecw', [['T,TEMPLATES', '39872', '', '', '', '']], MAPPING))
    expect(issues.some(i => i.messageKey === 'med.import.anomaly.notAPatient')).toBe(true)
  })

  it('marca nombre o apellido vacío tras el parseo', () => {
    const issues = issuesOf(detectPacienteAnomalies('ecw', [[',', '39872', '', '', '', '']], MAPPING))
    expect(issues.some(i => i.messageKey === 'med.import.anomaly.emptyName')).toBe(true)
  })

  it('un nombre limpio y bien formado no genera ninguna anomalía', () => {
    const issues = issuesOf(detectPacienteAnomalies('ecw', [['Perez,Juan', '39872', '', '7541234567', '', '']], MAPPING))
    expect(issues).toEqual([])
  })
})

describe('pacienteEntranteDe / fuenteEscrituraDe', () => {
  it('separa los campos de Paciente de las columnas sintéticas de identidad', () => {
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,JUAN', '39872', 'M', '7541234567', '', 'juan@x.com']],
      mapping: MAPPING, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes: new Map(), pacientes: [],
    })
    const values = plan.toInsert[0]
    const entrante = pacienteEntranteDe(values)
    expect(entrante).toEqual({ nombre: 'Juan', apellido: 'Perez', fecha_nacimiento: '2009-02-28', genero: 'M', telefono: '(754) 123-4567', email: 'juan@x.com' })
    expect('__clave_origen__' in entrante).toBe(false)

    const fuente = fuenteEscrituraDe(values)
    expect(fuente.fuente).toBe('ecw')
    expect(fuente.clave_origen).toBe(claveOrigen('ecw', { nombreCrudo: 'PEREZ,JUAN', dobCrudo: '39872' }))
    expect(fuente.dob_origen).toBe('39872')
    expect(fuente.ref_externa).toBeNull()
  })

  it('emed usa la clave de origen (el Chart#) como ref_externa', () => {
    const plan = buildPacienteImportPlan({
      rows: [['Juan', 'Perez', '39872', '', '', '2']],
      mapping: ['nombre', 'apellido', 'fecha_nacimiento', 'genero', 'telefono', 'chart'],
      dupMode: 'update', valueMap: {}, fuente: 'emed',
      existentes: new Map(), pacientes: [],
    })
    const fuente = fuenteEscrituraDe(plan.toInsert[0])
    expect(fuente.fuente).toBe('emed')
    expect(fuente.ref_externa).toBe(fuente.clave_origen)
    expect(fuente.clave_origen).toBe('2')
  })
})

describe('varias columnas de telefono', () => {
  // ECW: Chart#, nombre_crudo, DOB, telefono (Home), telefono (Cell), email
  const MAPPING_2TEL = ['nombre_crudo', 'fecha_nacimiento', 'telefono', 'telefono', 'email']

  it('las dos columnas de telefono entran como contactos', () => {
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,ANA', '31000', '3055550101', '7865550202', '']],
      mapping: MAPPING_2TEL, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes: new Map(), pacientes: [],
    })
    // `coercePacienteCelda` ya formateó cada celda con `normalizarTelefono` antes de que
    // `contactosDe` la vea -igual que en cualquier otro test de este archivo ('(754) 123-4567',
    // no '7541234567')-, así que el contacto guardado sale formateado, no en dígitos crudos.
    expect(contactosDe(plan.toInsert[0]).map(c => c.valor).sort())
      .toEqual(['(305) 555-0101', '(786) 555-0202'])
  })

  it('Home == Cell da UN solo contacto, sin codigo que lo fuerce', () => {
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,ANA', '31000', '3055550101', '3055550101', '']],
      mapping: MAPPING_2TEL, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes: new Map(), pacientes: [],
    })
    expect(contactosDe(plan.toInsert[0])).toHaveLength(1)
  })

  it('el principal es el primero no vacio', () => {
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,ANA', '31000', '', '7865550202', '']],
      mapping: MAPPING_2TEL, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes: new Map(), pacientes: [],
    })
    expect(pacienteEntranteDe(plan.toInsert[0]).telefono).toBe('(786) 555-0202')
  })

  it('el saneamiento valida TODAS las columnas de telefono, no solo la primera', () => {
    const r = detectPacienteAnomalies('ecw', [['PEREZ,ANA', '31000', '3055550101', '123', '']], MAPPING_2TEL)
    if (r.estado !== 'ok') throw new Error('esperaba estado ok')
    expect(r.issues.some(i => i.messageKey === 'med.import.anomaly.invalidPhone')).toBe(true)
  })

  it('guessMapping manda las dos columnas de telefono a telefono', () => {
    // 'Name', no 'Patient Name': `resolveToCanonical` matchea por IGUALDAD exacta contra
    // `HEADER_ALIASES` (`canonical.ts`), no por substring -'Patient Name' no está en la tabla
    // de alias y da `null`. Eso es un gap de la tabla de alias en sí, no del cambio de acá.
    // Los headers REALES de las tres hojas. Dos bugs se escaparon por probar con headers
    // inventados: 'Patient Name' no matcheaba (la tabla solo tenía 'name') y 'Contact#' tampoco
    // (la regex de teléfono no lo reconoce). Los dos aparecieron recién al importar el archivo.
    expect(guessMapping(['Chart#', 'First Name', 'Last Name', 'Gender', 'DOB', 'Contact#', 'Email']))
      .toEqual(['chart', 'nombre', 'apellido', 'genero', 'fecha_nacimiento', 'telefono', 'email'])
    expect(guessMapping(['Name', 'DOB', 'Phone - Cell', 'Phone - Home', 'Email']))
      .toEqual(['nombre_crudo', 'fecha_nacimiento', 'telefono', 'telefono', 'email'])
    expect(guessMapping(['Patient Name', 'DOB', 'Home Phone', 'Cell Phone', 'Email']))
      .toEqual(['nombre_crudo', 'fecha_nacimiento', 'telefono', 'telefono', 'email'])
  })

  it('el DOB crudo del archivo viaja a la fuente, sin interpretar', () => {
    // `dob_origen` es la mitad de "lo contradictorio" del spec (Step 4b): cuando dos fuentes
    // dicen fechas de nacimiento distintas, esto es lo que permite reconstruir qué dijo CADA
    // una. Va crudo a propósito -una fecha ilegible es justo el caso que hay que investigar-.
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,ANA', '31000', '3055550101', '', '']],
      mapping: MAPPING_2TEL, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes: new Map(), pacientes: [],
    })
    expect(fuenteEscrituraDe(plan.toInsert[0]).dob_origen).toBe('31000')
  })
})
