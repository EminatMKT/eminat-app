import { describe, expect, it } from 'vitest'
import mergeMultiValueRows from '.'

type Tag = { id: string; label: string }
const textOf = ({ label }: Tag) => label

describe('mergeMultiValueRows', () => {
  it('lists each side’s distinct values, winner first', () => {
    const rows = mergeMultiValueRows<Tag>([{ id: '1', label: 'red' }], [{ id: '2', label: 'blue' }], textOf)
    expect(rows).toEqual([
      { text: 'red', keptIds: ['1'], removableIds: [] },
      { text: 'blue', keptIds: [], removableIds: ['2'] },
    ])
  })

  it('shows a value both sides hold once, kept by the winner', () => {
    const rows = mergeMultiValueRows<Tag>([{ id: '1', label: 'red' }], [{ id: '2', label: 'red' }], textOf)
    expect(rows).toEqual([{ text: 'red', keptIds: ['1'], removableIds: ['2'] }])
  })

  // Same value under two `fuente`s on the loser: one row, and dropping it must drop both rows.
  it('folds a value the loser holds twice into one row carrying both ids', () => {
    const rows = mergeMultiValueRows<Tag>([], [{ id: '2', label: 'red' }, { id: '3', label: 'red' }], textOf)
    expect(rows).toEqual([{ text: 'red', keptIds: [], removableIds: ['2', '3'] }])
  })

  it('has no rows when neither side holds a value', () => {
    expect(mergeMultiValueRows<Tag>([], [], textOf)).toEqual([])
  })
})
