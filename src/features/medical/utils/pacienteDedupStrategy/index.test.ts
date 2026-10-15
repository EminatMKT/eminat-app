import { describe, it, expect } from 'vitest'
import { pacienteDedupStrategy } from './index'
import type { Paciente } from '@/features/medical/types'
import type { Identificable } from '@/features/medical/utils/pacienteIdentity'

type PatientWithAudit = Partial<Identificable> &
  Partial<Pick<Paciente, 'mrn' | 'created_at' | 'updated_at'>>

describe('pacienteDedupStrategy', () => {
  it('finds no candidate for the first registration and maps it for a matching second registration', () => {
    const first: Identificable = {
      id: 'first',
      nombre: 'Ana',
      apellido: 'Gomez',
      fecha_nacimiento: '1990-01-01',
    }
    const second: Identificable = { ...first, id: 'second' }

    expect(pacienteDedupStrategy.candidatos(first, [])).toEqual([])
    expect(pacienteDedupStrategy.candidatos(second, [first])).toEqual([
      { nivel: 'exacta', item: first },
    ])
  })

  it('excludes identity and audit fields while retaining and filling patient values', () => {
    const existing: PatientWithAudit = {
      id: 'a',
      mrn: 'MRN-1',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      nombre: 'Ana',
      apellido: '',
    }
    const incoming: PatientWithAudit = {
      id: 'b',
      mrn: 'MRN-2',
      created_at: '2026-02-01',
      updated_at: '2026-02-01',
      apellido: 'Gomez',
    }

    const existingBefore = { ...existing }
    const incomingBefore = { ...incoming }
    const { resultado: result } = pacienteDedupStrategy.fusionar(existing, incoming)

    expect(result).toEqual({ nombre: 'Ana', apellido: 'Gomez' })
    expect(result).not.toHaveProperty('id')
    expect(result).not.toHaveProperty('mrn')
    expect(result).not.toHaveProperty('created_at')
    expect(result).not.toHaveProperty('updated_at')
    expect(existing).toEqual(existingBefore)
    expect(incoming).toEqual(incomingBefore)
  })

  it('propagates birth date conflicts while retaining the existing value', () => {
    const existing: Partial<Identificable> = { fecha_nacimiento: '1990-01-01' }
    const incoming: Partial<Identificable> = { fecha_nacimiento: '1991-02-02' }

    const { resultado: result, choques: conflicts } = pacienteDedupStrategy.fusionar(existing, incoming)

    expect(result.fecha_nacimiento).toBe(existing.fecha_nacimiento)
    expect(conflicts).toEqual(['fecha_nacimiento'])
  })
})
