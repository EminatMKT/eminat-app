import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sources(path) :
      /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
  })
}

describe('native Sales runtime boundary', () => {
  it('has no ANNIE adapter import, route, runtime setting, or Production hostname', () => {
    const roots = [
      'src/server/sales-native',
      'src/app/api/sales-native',
      'src/features/native-sales',
      'src/app/(app)/sales-native',
    ]
    for (const file of roots.flatMap(root => sources(join(process.cwd(), root)))) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/from\s*['"][^'"]*integrations\/annie/)
      expect(source, file).not.toMatch(/from\s*['"][^'"]*features\/annie-sales/)
      expect(source, file).not.toContain('/api/integrations/annie')
      expect(source, file).not.toMatch(/process\.env\.ANNIE_[A-Z_]+/)
      expect(source, file).not.toContain('annie.stratixsolutions.us')
    }
  })

  it('keeps the shared shell on the native access route during native preview', () => {
    const accessHook = readFileSync(join(process.cwd(), 'src/features/annie-sales/useSalesQaAccess.ts'), 'utf8')
    expect(accessHook).toContain("pathname.startsWith('/sales-native')")
    expect(accessHook).toContain("nativePreview ? '/api/sales-native/access' : '/api/sales/access'")
  })
})
