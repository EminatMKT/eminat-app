import { describe, expect, it } from 'vitest'
import flattenEmbed from '.'

describe('flattenEmbed', () => {
  it('moves the embedded join rows to responsables', () => {
    const embedded = [{ usuario_id: 'usr-1', es_lider: true }]
    const row = { id: 'act-1', titulo: 'Pauta', actividad_responsables: embedded }

    expect(flattenEmbed(row)).toEqual({ id: 'act-1', titulo: 'Pauta', responsables: embedded })
  })

  it('turns a missing or null embed into an empty list', () => {
    const missing = { id: 'act-1' }
    const empty = { id: 'act-2', actividad_responsables: null }

    expect(flattenEmbed(missing)).toEqual({ id: 'act-1', responsables: [] })
    expect(flattenEmbed(empty)).toEqual({ id: 'act-2', responsables: [] })
  })
})
