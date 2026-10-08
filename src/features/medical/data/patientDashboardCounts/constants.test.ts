import { expect, it } from 'vitest'
import {
  ID_COLUMN,
  EMAIL_COLUMN,
  GENERO_COLUMN,
  TELEFONO_COLUMN,
  FECHA_NACIMIENTO_COLUMN,
  IS_OPERATOR,
  GENERO_FEMALE,
  GENERO_MALE,
  COUNT_ONLY,
  KNOWN_AREA_CODES,
  AREA_CODE_OTHER,
  LABEL_OTHER,
  CHILD_CUTOFF_YEARS,
  YOUNG_ADULT_CUTOFF_YEARS,
  ADULT_CUTOFF_YEARS,
  OLDER_ADULT_CUTOFF_YEARS,
} from './constants'

it('names the pacientes columns the count queries filter on', () => {
  expect(ID_COLUMN).toBe('id')
  expect(EMAIL_COLUMN).toBe('email')
  expect(GENERO_COLUMN).toBe('genero')
  expect(TELEFONO_COLUMN).toBe('telefono')
  expect(FECHA_NACIMIENTO_COLUMN).toBe('fecha_nacimiento')
  expect(IS_OPERATOR).toBe('is')
  expect(GENERO_FEMALE).toBe('F')
  expect(GENERO_MALE).toBe('M')
})

it('asks PostgREST for a match count only, never row data', () => {
  expect(COUNT_ONLY.count).toBe('exact')
  expect(COUNT_ONLY.head).toBe(true)
})

it('groups the five known Florida area codes by county, with one trailing other bucket', () => {
  expect(KNOWN_AREA_CODES).toHaveLength(5)
  expect(KNOWN_AREA_CODES.map((known) => known.code)).toEqual(['786', '305', '954', '754', '561'])
  expect(AREA_CODE_OTHER).toBe('other')
  expect(LABEL_OTHER).toBe('Other')
})

it('orders the age-bucket cutoffs youngest to oldest', () => {
  expect(CHILD_CUTOFF_YEARS).toBeLessThan(YOUNG_ADULT_CUTOFF_YEARS)
  expect(YOUNG_ADULT_CUTOFF_YEARS).toBeLessThan(ADULT_CUTOFF_YEARS)
  expect(ADULT_CUTOFF_YEARS).toBeLessThan(OLDER_ADULT_CUTOFF_YEARS)
})
