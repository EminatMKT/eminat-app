import { describe, it, expect } from 'vitest'
import * as medical from './index'
import { calcAge } from './dates'
import { generateDemoData } from './demo-data'

describe('features/medical API pública', () => {
  it('expone MedicalModule', () => {
    expect(medical.MedicalModule).toBeDefined()
  })
  it('declara su access', () => {
    expect(medical.access).toEqual({ module: 'medical' })
  })
})

describe('calcAge', () => {
  it('calcula la edad ajustando si el cumpleaños no pasó este año', () => {
    const y = new Date().getFullYear()
    expect(calcAge(`${y - 30}-01-01`)).toBe(30)
    // nace el 31 de diciembre de hace 30 años → aún no cumplió, 29
    expect(calcAge(`${y - 30}-12-31`)).toBe(29)
  })
})

describe('generateDemoData', () => {
  it('arma el set demo completo', () => {
    const d = generateDemoData()
    expect(d.pacientes).toHaveLength(8)
    expect(d.citas).toHaveLength(10)
    expect(d.incidentes).toHaveLength(3)
    expect(d.trainings).toHaveLength(9)
  })
})
