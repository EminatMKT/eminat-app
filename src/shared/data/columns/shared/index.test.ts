import { describe, expect, it } from 'vitest'
import TABLE_COLUMNS from '..'
import SHARED_COLUMNS from '.'

const groups = Object.values(SHARED_COLUMNS)
const sharedNames = new Set<string>(groups.flatMap(group => Object.values(group)))

describe('SHARED_COLUMNS', () => {
  it('groups do not overlap each other', () => {
    const all = groups.flatMap(group => Object.values(group))
    expect(all).toHaveLength(new Set(all).size)
  })

  it('names the cross-table columns: id, created_at and updated_at are never written by hand', () => {
    expect(sharedNames).toEqual(new Set(['id', 'created_at', 'updated_at', 'codigo', 'nombre', 'activo']))
  })

  it('a column written by hand appears in one table only; a repeated one must come from a shared group', () => {
    const ownNames = Object.values(TABLE_COLUMNS)
      .flatMap(columns => Object.values(columns))
      .filter(name => !sharedNames.has(name))
    expect(ownNames).toHaveLength(new Set(ownNames).size)
  })
})
