import { describe, it, expect } from 'vitest'
import pickerDisplay from './index'

const MEMBERS = [{ id: 'a', nombre: 'Ana Bravo' }, { id: 'b', nombre: 'Beto Cruz' }, { id: 'c', nombre: 'Ceci Diaz' }]
const PLACEHOLDER = '— Pick —'

describe('pickerDisplay', () => {
  it('reads the placeholder while nobody is in', () => {
    expect(pickerDisplay(MEMBERS, [], PLACEHOLDER)).toBe(PLACEHOLDER)
  })

  it('reads crown, leader and how many more, like the card', () => {
    const rows = [{ usuario_id: 'a', es_lider: false }, { usuario_id: 'b', es_lider: true }, { usuario_id: 'c', es_lider: false }]
    expect(pickerDisplay(MEMBERS, rows, PLACEHOLDER)).toBe('👑 Beto Cruz +2')
  })

  it('without a leader it is the first name and the count, no crown', () => {
    const rows = [{ usuario_id: 'a', es_lider: false }]
    expect(pickerDisplay(MEMBERS, rows, PLACEHOLDER)).toBe('Ana Bravo')
  })
})
