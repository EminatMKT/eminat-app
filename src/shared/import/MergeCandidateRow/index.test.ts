import { describe, it, expect } from 'vitest'
import { fmt, haySolape } from './index'

// Sin jsdom/testing-library (ver `componentes.md`) no se puede montar `MergeCandidateRow`: estos
// tests cubren sus dos funciones puras, exportadas para eso. `haySolape` es la que decide
// `diff` -si la fila entrante y un candidato "chocan" en un campo-, y es la pieza delicada:
// un campo `multi` (telefono/email) llega como array, y compartir UN valor entre las dos listas
// es evidencia de que son la MISMA persona, no de que sean distintas.
describe('fmt', () => {
  it('un array con valores se muestra como lista', () => {
    expect(fmt(['305', '786'])).toBe('305 · 786')
  })

  it('un array vacío se muestra como el placeholder, igual que null/undefined/""', () => {
    expect(fmt([])).toBe('—')
    expect(fmt(null)).toBe('—')
    expect(fmt(undefined)).toBe('—')
    expect(fmt('')).toBe('—')
  })

  it('un escalar se muestra tal cual -el caso de Research, que no declara campos multi', () => {
    expect(fmt('a')).toBe('a')
  })
})

describe('haySolape', () => {
  it('entrante con dos telefonos y el candidato comparte uno: SOLAPAN -no es choque', () => {
    expect(haySolape('305', ['305', '786'])).toBe(true)
  })

  it('entrante con dos telefonos y el candidato no comparte ninguno: NO solapan -choque', () => {
    expect(haySolape('999', ['305', '786'])).toBe(false)
  })

  it('al candidato le falta el dato: no es choque -"ausente" no es "distinto"', () => {
    expect(haySolape('', '305')).toBe(true)
  })

  it('a la fila entrante le falta el dato (array vacío): no es choque', () => {
    expect(haySolape('305', [])).toBe(true)
  })

  it('caso Research (sin campos multi, todo escalar): valores distintos SÍ chocan', () => {
    expect(haySolape('a', 'b')).toBe(false)
  })

  it('caso Research: el mismo valor de los dos lados no choca', () => {
    expect(haySolape('a', 'a')).toBe(true)
  })
})
