import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('public Terms technical correction', () => {
  it('preserves every byte outside the reviewed accounting paragraph', () => {
    const before = readFileSync('docs/releases/security-closure/terms-before.html', 'utf8')
    const after = readFileSync('docs/releases/security-closure/terms-candidate.html', 'utf8')
    const paragraph = /<p>[^<]*(?:ANNIE|LILLY \/ Native Sales)[^<]*<\/p>/
    expect(before.match(paragraph)).toHaveLength(1)
    expect(after.match(paragraph)).toHaveLength(1)
    expect(after.replace(paragraph, '[ACCOUNTING]')).toBe(before.replace(paragraph, '[ACCOUNTING]'))
    expect(after).not.toContain('ANNIE')
    expect(after).not.toContain('Any future QuickBooks-hosted')
    expect(after).toContain('applicable payment terms')
  })
})
