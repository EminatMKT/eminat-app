import { describe, expect, it } from 'vitest'
import upsertActividad from '.'

const a = { id: 'a', titulo: 'A' }
const b = { id: 'b', titulo: 'B' }

describe('upsertActividad', () => {
  it('replaces an edited task in place, keeping the list order', () => {
    const editada = { id: 'b', titulo: 'B2' }
    expect(upsertActividad([a, b], editada)).toEqual([a, editada])
  })

  it('puts a new task first, like the newest-first board', () => {
    const nueva = { id: 'n', titulo: 'N' }
    expect(upsertActividad([a], nueva)).toEqual([nueva, a])
  })
})
