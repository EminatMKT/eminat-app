import { describe, it, expect } from 'vitest'
import countTone from './index'

const MAX = 10
const FAR = 7
const NEAR = 8

describe('countTone', () => {
  it('draws nothing while the text is far from the limit', () => {
    expect(countTone(FAR, MAX)).toBeNull()
  })

  it('shows a quiet count once the text nears the limit', () => {
    expect(countTone(NEAR, MAX)).toBe('near')
  })

  it('warns once the text reaches the limit', () => {
    expect(countTone(MAX, MAX)).toBe('full')
  })

  it('draws nothing for a box without a limit', () => {
    expect(countTone(MAX, 0)).toBeNull()
  })
})
