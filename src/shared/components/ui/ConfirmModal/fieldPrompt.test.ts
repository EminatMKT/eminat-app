import { describe, expect, it } from 'vitest'
import fieldPrompt from './fieldPrompt'

const t = (key: string, vars?: Record<string, string>) => `${key}:${vars?.frase ?? ''}`

describe('fieldPrompt', () => {
  it('uses the explicit confirmPhraseLabel when the caller gives one', () => {
    expect(fieldPrompt('BORRAR', 'Escribí BORRAR', undefined, t)).toBe('Escribí BORRAR')
  })

  it('falls back to the translated phrase prompt', () => {
    expect(fieldPrompt('BORRAR', undefined, undefined, t)).toBe('common.confirmPhrase:BORRAR')
  })

  it('uses notaLabel when there is no confirmPhrase', () => {
    expect(fieldPrompt(undefined, undefined, 'Nota', t)).toBe('Nota')
  })

  it('is undefined when neither field applies', () => {
    expect(fieldPrompt(undefined, undefined, undefined, t)).toBeUndefined()
  })
})
