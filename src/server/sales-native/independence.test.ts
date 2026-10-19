import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sources(path) :
      entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : []
  })
}

describe('native Sales runtime boundary', () => {
  it('has no ANNIE adapter import, ANNIE runtime setting, or Production hostname', () => {
    const root = join(process.cwd(), 'src/server/sales-native')
    for (const file of sources(root)) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/from\s*['"][^'"]*integrations\/annie/)
      expect(source, file).not.toMatch(/process\.env\.ANNIE_[A-Z_]+/)
      expect(source, file).not.toContain('annie.stratixsolutions.us')
    }
  })
})
