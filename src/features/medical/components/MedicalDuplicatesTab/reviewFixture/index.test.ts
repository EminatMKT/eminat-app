import { describe, expect, it } from 'vitest'
import reviewFixture from '.'

describe('reviewFixture', () => {
  it('builds a patient under review with no contacts unless given', () => {
    const review = reviewFixture({ seguro: 'Aetna' })
    expect(review.paciente.seguro).toBe('Aetna')
    expect(review.telefono).toEqual([])
    expect(review.email).toEqual([])
  })
})
