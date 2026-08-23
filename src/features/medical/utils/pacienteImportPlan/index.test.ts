import { describe, it, expect } from 'vitest'
import {
  fuenteDeHoja, indexPorClave, buildPacienteImportPlan, detectPacienteAnomalies,
  pacienteEntranteDe, fuenteEscrituraDe,
} from './index'
import { claveOrigen } from '../pacienteIdentity'
import type { PacienteFuente } from '@/features/medical/types'
import type { Identificable } from '../pacienteIdentity'

// mapping usado en casi todos los casos: una fila cruda con nombre en un solo campo (ECW /
// eClinPro), fecha de nacimiento, género, teléfono, teléfono alterno y email.
const MAPPING = ['nombre_crudo', 'fecha_nacimiento', 'genero', 'telefono', 'telefono_alt', 'email']

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
      { paciente_id: 'p1', fuente: 'ecw', clave_origen: 'a', nombre_origen: null, ref_externa: null, importado_at: '' },
      { paciente_id: null, fuente: 'ecw', clave_origen: 'b', nombre_origen: null, ref_externa: null, importado_at: '' },
      { paciente_id: 'p2', fuente: 'eclinpro', clave_origen: 'a', nombre_origen: null, ref_externa: null, importado_at: '' },
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
  it('sin fuente reconocida no procesa ninguna fila', () => {
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,JUAN', '39872', 'M', '7541234567', '', 'juan@x.com']],
      mapping: MAPPING, dupMode: 'update', valueMap: {}, fuente: null,
      existentes: new Map(), pacientes: [],
    })
    expect(plan.toInsert).toHaveLength(0)
  })

  it('arma una fila nueva con el nombre parseado, la fecha resuelta y el teléfono formateado', () => {
    const plan = buildPacienteImportPlan({
      rows: [['PEREZ,JUAN', '39872', 'M', '7541234567', '7541234567', 'juan@x.com']],
      mapping: MAPPING, dupMode: 'update', valueMap: {}, fuente: 'ecw',
      existentes: new Map(), pacientes: [],
    })
    expect(plan.toInsert).toHaveLength(1)
    const v = plan.toInsert[0]
    expect(v.nombre).toBe('Juan')
    expect(v.apellido).toBe('Perez')
    expect(v.fecha_nacimiento).toBe('2009-02-28')
    expect(v.genero).toBe('M')
    expect(v.telefono).toBe('(754) 123-4567')
    // Home == Cell: telefono_alt se apaga.
    expect(v.telefono_alt).toBeNull()
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
  it('sin fuente reconocida no marca nada', () => {
    expect(detectPacienteAnomalies(null, [['x', '', '', '', '', '']], MAPPING)).toEqual([])
  })

  it('marca el mojibake en el nombre', () => {
    const issues = detectPacienteAnomalies('ecw', [['PeÃ±a,Juan', '39872', '', '', '', '']], MAPPING)
    expect(issues.some(i => i.messageKey === 'med.import.anomaly.mojibake')).toBe(true)
  })

  it('marca la fecha futura', () => {
    const issues = detectPacienteAnomalies('ecw', [['Perez,Juan', '60000', '', '', '', '']], MAPPING)
    expect(issues.some(i => i.messageKey === 'med.import.anomaly.futureDob')).toBe(true)
  })

  it('marca la fecha faltante', () => {
    const issues = detectPacienteAnomalies('ecw', [['Perez,Juan', '', '', '', '', '']], MAPPING)
    expect(issues.some(i => i.messageKey === 'med.import.anomaly.missingDob')).toBe(true)
  })

  it('marca un teléfono que no da 10 dígitos', () => {
    const issues = detectPacienteAnomalies('ecw', [['Perez,Juan', '39872', '', '123', '', '']], MAPPING)
    expect(issues.some(i => i.messageKey === 'med.import.anomaly.invalidPhone' && i.colIndex === 3)).toBe(true)
  })

  it('marca una fila que no parece un paciente sin ser una lista de una cadena', () => {
    const issues = detectPacienteAnomalies('ecw', [['T,TEMPLATES', '39872', '', '', '', '']], MAPPING)
    expect(issues.some(i => i.messageKey === 'med.import.anomaly.notAPatient')).toBe(true)
  })

  it('marca nombre o apellido vacío tras el parseo', () => {
    const issues = detectPacienteAnomalies('ecw', [[',', '39872', '', '', '', '']], MAPPING)
    expect(issues.some(i => i.messageKey === 'med.import.anomaly.emptyName')).toBe(true)
  })

  it('un nombre limpio y bien formado no genera ninguna anomalía', () => {
    const issues = detectPacienteAnomalies('ecw', [['Perez,Juan', '39872', '', '7541234567', '', '']], MAPPING)
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
    expect(entrante).toEqual({ nombre: 'Juan', apellido: 'Perez', fecha_nacimiento: '2009-02-28', genero: 'M', telefono: '(754) 123-4567', telefono_alt: null, email: 'juan@x.com' })
    expect('__clave_origen__' in entrante).toBe(false)

    const fuente = fuenteEscrituraDe(values)
    expect(fuente.fuente).toBe('ecw')
    expect(fuente.clave_origen).toBe(claveOrigen('ecw', { nombreCrudo: 'PEREZ,JUAN', dobCrudo: '39872' }))
    expect(fuente.ref_externa).toBeNull()
  })

  it('emed usa la clave de origen (el Chart#) como ref_externa', () => {
    const plan = buildPacienteImportPlan({
      rows: [['Juan', 'Perez', '39872', '', '', '', '2']],
      mapping: ['nombre', 'apellido', 'fecha_nacimiento', 'genero', 'telefono', 'telefono_alt', 'chart'],
      dupMode: 'update', valueMap: {}, fuente: 'emed',
      existentes: new Map(), pacientes: [],
    })
    const fuente = fuenteEscrituraDe(plan.toInsert[0])
    expect(fuente.fuente).toBe('emed')
    expect(fuente.ref_externa).toBe(fuente.clave_origen)
    expect(fuente.clave_origen).toBe('2')
  })
})
