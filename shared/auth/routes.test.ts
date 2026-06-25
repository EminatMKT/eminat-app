import { describe, it, expect } from 'vitest'
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ALL_MODULES } from './permissions'

// Garantiza que el registro de módulos (ALL_MODULES, derivado de MODULE_META) NO se
// desincronice de las carpetas de ruta del App Router. La carpeta ES la ruta; el slug
// debe espejarla 1:1. Si agregás un módulo y te olvidás de MODULE_META (o al revés), falla.
const APP_DIR = join(process.cwd(), 'app', '(app)')

// Carpetas de ruta que existen a propósito SIN ser módulos (stubs / vistas especiales).
const NON_MODULE_ROUTES = ['finanzas', 'overview']

const routeFolders = readdirSync(APP_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('(')) // ignora route groups
  .map(d => d.name)

describe('rutas ↔ carpetas (App Router)', () => {
  it('cada ModuleSlug tiene su carpeta de ruta con page.tsx', () => {
    for (const slug of ALL_MODULES) {
      expect(existsSync(join(APP_DIR, slug, 'page.tsx')), `falta app/(app)/${slug}/page.tsx`).toBe(true)
    }
  })

  it('cada carpeta de ruta es un ModuleSlug o un stub declarado (sin huérfanas)', () => {
    const known = new Set<string>([...ALL_MODULES, ...NON_MODULE_ROUTES])
    const huerfanas = routeFolders.filter(f => !known.has(f))
    expect(huerfanas, `carpetas sin slug ni stub declarado: ${huerfanas.join(', ')}`).toEqual([])
  })
})
