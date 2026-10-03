import { describe, it, expect } from 'vitest'
import matches from './index'

const OPTIONS = ['Remodelación del CRM', 'Campaña de verano', 'Presupuesto Q4']

describe('matches', () => {
  it('returns every option for an empty box', () => {
    expect(matches(OPTIONS, '')).toEqual(OPTIONS)
  })

  it('treats bare spaces as an empty box', () => {
    expect(matches(OPTIONS, '   ')).toEqual(OPTIONS)
  })

  // What the native `<datalist>` did not do, and why this component exists.
  it('finds by the middle of the label, not only the start', () => {
    expect(matches(OPTIONS, 'crm')).toEqual(['Remodelación del CRM'])
  })

  it('ignores case', () => {
    expect(matches(OPTIONS, 'PRESUPUESTO')).toEqual(['Presupuesto Q4'])
  })

  it('ignores accents on both sides', () => {
    expect(matches(OPTIONS, 'remodelacion')).toEqual(['Remodelación del CRM'])
    expect(matches(['Campana de verano'], 'campaña')).toEqual(['Campana de verano'])
  })

  it('returns every match, not the first one', () => {
    expect(matches(['Acta de enero', 'Acta de marzo', 'Cierre'], 'acta')).toHaveLength(2)
  })

  it('returns an empty list when nothing matches', () => {
    expect(matches(OPTIONS, 'zzz')).toEqual([])
  })

  it('moves the pinned option to the top without losing the rest', () => {
    expect(matches(OPTIONS, '', 'Presupuesto Q4')[0]).toBe('Presupuesto Q4')
    expect(matches(OPTIONS, '', 'Presupuesto Q4')).toHaveLength(OPTIONS.length)
  })

  it('does not rescue the pinned option when the filter left it out', () => {
    expect(matches(OPTIONS, 'crm', 'Presupuesto Q4')).toEqual(['Remodelación del CRM'])
  })

  it('ignores a pinned option that is not in the list', () => {
    expect(matches(OPTIONS, '', 'No existe')).toEqual(OPTIONS)
  })

  it('filters objects by the text the accessor reads', () => {
    const people = [{ id: 'a', label: 'Ana Bravo' }, { id: 'b', label: 'Beto Cruz' }]
    expect(matches(people, 'bravo', undefined, p => p.label)).toEqual([people[0]])
  })
})
