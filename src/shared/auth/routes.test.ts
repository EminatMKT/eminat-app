import { describe, it, expect } from 'vitest'
import { readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_MODULES, modulePath } from './permissions'

// Garantiza que el registro de módulos (ALL_MODULES, derivado de MODULE_META) NO se
// desincronice de las carpetas de ruta del App Router. La carpeta ES la ruta; el slug
// debe espejarla 1:1. Si agregás un módulo y te olvidás de MODULE_META (o al revés), falla.
// Relativo a ESTE archivo, no al cwd: con cwd, mover el código a src/ dejó el test
// buscando ./app/(app) en la raíz del repo, que ya no existe (19/08/2026).
const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'app', '(app)')

// Carpetas de ruta que existen a propósito SIN ser módulos (stubs / vistas especiales).
const NON_MODULE_ROUTES = ['finanzas', 'overview']

const routeFolders = readdirSync(APP_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('(')) // ignora route groups
  .map(d => d.name)

// The folder is the module's path, not its slug: `cobranzas` is served from `billing/`.
const moduleFolders = ALL_MODULES.map(slug => modulePath(slug).slice(1))

describe('rutas ↔ carpetas (App Router)', () => {
  it('cada ModuleSlug tiene su carpeta de ruta con page.tsx', () => {
    for (const folder of moduleFolders) {
      expect(existsSync(join(APP_DIR, folder, 'page.tsx')), `falta app/(app)/${folder}/page.tsx`).toBe(true)
    }
  })

  it('cada carpeta de ruta es un ModuleSlug o un stub declarado (sin huérfanas)', () => {
    const known = new Set<string>([...moduleFolders, ...NON_MODULE_ROUTES])
    const huerfanas = routeFolders.filter(f => !known.has(f))
    expect(huerfanas, `carpetas sin slug ni stub declarado: ${huerfanas.join(', ')}`).toEqual([])
  })
})
