import { describe, expect, it } from 'vitest'
import confirmedNote from './confirmedNote'

describe('confirmedNote', () => {
  it('is undefined outside note mode', () => {
    expect(confirmedNote(undefined, 'something')).toBeUndefined()
  })

  it('is undefined for blank or whitespace-only text', () => {
    expect(confirmedNote('Note', '   ')).toBeUndefined()
  })

  it('trims the note before returning it', () => {
    expect(confirmedNote('Note', '  ready  ')).toBe('ready')
  })
})
