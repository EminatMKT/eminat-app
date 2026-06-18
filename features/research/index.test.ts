import { describe, it, expect } from 'vitest'
import * as research from './index'
import { escapeHtml } from './html'

describe('features/research API pública', () => {
  it('expone ResearchModule', () => {
    expect(research.ResearchModule).toBeDefined()
  })
  it('declara su access (convención access-aware)', () => {
    expect(research.access).toEqual({ module: 'research' })
  })
})

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
