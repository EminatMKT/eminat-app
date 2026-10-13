import { describe, expect, it } from 'vitest'
import { isVisibleInDirectory } from './directoryVisibility'

describe('Directory visibility during legacy transition', () => {
  it('shows existing people without writing a backfill', () => {
    expect(isVisibleInDirectory({ email: 'person@eminat.net', directorio_visible: null })).toBe(true)
    expect(isVisibleInDirectory({ email: 'PRUEBA@EMC.HEALTH', directorio_visible: null })).toBe(false)
  })

  it('honors explicit admin choices, including legacy shared accounts', () => {
    expect(isVisibleInDirectory({ email: 'person@eminat.net', directorio_visible: false })).toBe(false)
    expect(isVisibleInDirectory({ email: 'prueba@emc.health', directorio_visible: true })).toBe(true)
  })
})
