import { describe, it, expect } from 'vitest'
import { inputStyle, selectStyle } from './index'

describe('styles', () => {
  it('selectStyle keeps every inputStyle field it does not override', () => {
    expect(selectStyle.border).toBe(inputStyle.border)
    expect(selectStyle.fontFamily).toBe(inputStyle.fontFamily)
  })

  it('selectStyle overrides width, padding and fontSize for a compact control', () => {
    expect(selectStyle.width).toBe('auto')
    expect(selectStyle.padding).not.toBe(inputStyle.padding)
    expect(selectStyle.fontSize).not.toBe(inputStyle.fontSize)
  })
})
