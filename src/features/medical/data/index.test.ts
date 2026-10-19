import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

vi.mock('@/shared/db/supabase', () => ({ supabase: {} }))

import { getPaciente, patientNames } from '.'

describe('medical data barrel', () => {
  it('offers the reads the duplicate review uses', () => {
    expect(typeof getPaciente).toBe('function')
    expect(typeof patientNames).toBe('function')
  })
})
