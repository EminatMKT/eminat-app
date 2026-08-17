import { describe, it, expect, beforeEach } from 'vitest'
import { readPref, writePref, oneOf } from './usePersistedState'
import { writeUserPreference, userPrefKey, LAST_MODULE_KEY } from './useUserPreference'

// localStorage mínimo: los tests corren en entorno node, sin DOM.
const store = new Map<string, string>()
beforeEach(() => store.clear())
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
  },
  configurable: true,
})

const isTab = oneOf('dashboard', 'leads')

describe('readPref / writePref (el par que usan el hook y ModuleGate)', () => {
  it('lo escrito se recupera igual — incluidos los strings sueltos', () => {
    // El bug que motivó el test: ModuleGate guardaba el slug con setItem crudo ('research') y
    // el hook leía con JSON.parse, que revienta con eso. La preferencia no funcionó nunca y el
    // catch se comía el error. Mientras ambos lados usen esta pareja, no puede repetirse.
    writePref('k', 'research')
    expect(readPref('k', null as string | null)).toBe('research')
  })

  it('conserva objetos, como los valores de los filtros', () => {
    writePref('f', { nct: '05512004', addedFrom: '2026-07-01' })
    expect(readPref('f', {})).toEqual({ nct: '05512004', addedFrom: '2026-07-01' })
  })

  it('sin nada guardado devuelve el default', () => {
    expect(readPref('vacio', 'dashboard')).toBe('dashboard')
  })

  it('un valor corrupto no rompe: cae al default', () => {
    store.set('roto', '{no es json')
    expect(readPref('roto', 'dashboard')).toBe('dashboard')
  })

  it('un valor que dejó de ser válido cae al default en vez de dejar el módulo en blanco', () => {
    writePref('tab', 'kanban') // tab que existía y se renombró
    expect(readPref('tab', 'dashboard', isTab)).toBe('dashboard')
    writePref('tab', 'leads')
    expect(readPref('tab', 'dashboard', isTab)).toBe('leads')
  })

  it('lo que escribe ModuleGate es exactamente lo que lee el Launchpad', () => {
    // El round-trip completo, con la clave namespaceada incluida: es el camino real que estaba
    // roto (escritor fuera de React ↔ lector del hook), no solo el formato del valor.
    writeUserPreference('u-1', LAST_MODULE_KEY, 'research')
    expect(readPref(userPrefKey('u-1', LAST_MODULE_KEY), null as string | null)).toBe('research')
  })

  it('cada usuario lee lo suyo en la misma máquina', () => {
    writeUserPreference('u-1', LAST_MODULE_KEY, 'research')
    writeUserPreference('u-2', LAST_MODULE_KEY, 'medical')
    expect(readPref(userPrefKey('u-1', LAST_MODULE_KEY), null as string | null)).toBe('research')
    expect(readPref(userPrefKey('u-2', LAST_MODULE_KEY), null as string | null)).toBe('medical')
  })
})
