import { describe, expect, it } from 'vitest'
import pacienteFixture from '@/features/medical/hooks/usePacientes/fixture'
import FIELD_MAPS from '.'

describe('FIELD_MAPS', () => {
  it('has a label key for every field it can read a value from', () => {
    const valueFields = Object.keys(FIELD_MAPS.values)
    const labelFields = Object.keys(FIELD_MAPS.labelKeys)
    expect(valueFields.sort()).toEqual(labelFields.sort())
  })

  it('reads a plain string field by name', () => {
    const patient = pacienteFixture({ nombre: 'Carla' })
    expect(FIELD_MAPS.values.nombre(patient)).toBe('Carla')
  })

  it('reads a nullable field as an empty string instead of null', () => {
    const patient = pacienteFixture({ seguro: null })
    expect(FIELD_MAPS.values.seguro(patient)).toBe('')
  })

  it('reads a nullable field with a value', () => {
    const patient = pacienteFixture({ seguro: 'Aetna' })
    expect(FIELD_MAPS.values.seguro(patient)).toBe('Aetna')
  })
})
