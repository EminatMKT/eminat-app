import { describe, expect, it } from 'vitest'
import summarizePaciente from '.'

const ana = { nombre: 'Ana', apellido: 'Lopez' }

describe('summarizePaciente', () => {
  it('reads first name then last name', () => {
    expect(summarizePaciente(ana)).toBe('Ana Lopez')
  })
})
