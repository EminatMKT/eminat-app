import { describe, it, expect } from 'vitest'
import { escapeHtml } from './html'

describe('escapeHtml', () => {
  it('neutraliza HTML peligroso (print popup / email)', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(escapeHtml(`a & "b" 'c'`)).toBe('a &amp; &quot;b&quot; &#39;c&#39;')
  })
  it('null/undefined → string vacío', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })
})
