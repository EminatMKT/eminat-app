import { describe, it, expect } from 'vitest'
import WELCOME_COPY from './index'

describe('welcome email copy', () => {
  it('every line is written, none left empty', () => {
    const lines = Object.values(WELCOME_COPY)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every(Boolean)).toBe(true)
  })
  it('the subject is the one the inbox already threads on', () => {
    expect(WELCOME_COPY.subject).toBe('Tu acceso a Stratix Solutions')
  })
})
