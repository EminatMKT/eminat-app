import { describe, it, expect } from 'vitest'
import { modulePath, moduleForPath, ROUTES } from './index'

describe('modulePath', () => {
  it('la ruta de un módulo es / + slug', () => {
    expect(modulePath('cobranzas')).toBe('/cobranzas')
    expect(modulePath('th-hr')).toBe('/th-hr')
  })
})

describe('moduleForPath', () => {
  it('mapea ruta a slug', () => { expect(moduleForPath('/cobranzas/x')).toBe('cobranzas') })
  it('la raíz del módulo también', () => { expect(moduleForPath('/cobranzas')).toBe('cobranzas') })
  it('overview → admin', () => { expect(moduleForPath('/overview')).toBe('admin') })
  it('ruta no gateada → null', () => {
    expect(moduleForPath(ROUTES.login)).toBeNull()
    expect(moduleForPath(ROUTES.home)).toBeNull()
    expect(moduleForPath('/api/admin/x')).toBeNull()
  })

  // El orden por prefijo más largo es lo único no obvio de la función: sin él, un slug que es
  // prefijo de otro ganaría por llegar primero al bucle.
  it('gana el prefijo más largo', () => {
    expect(moduleForPath('/th-hr')).toBe('th-hr')
    expect(moduleForPath('/stratix-mkt/kanban')).toBe('stratix-mkt')
  })

  it('/tasks es su propio módulo', () => {
    expect(moduleForPath('/tasks')).toBe('tasks')
    expect(moduleForPath('/tasks/kanban')).toBe('tasks')
  })

  // Un slug que sólo COMPARTE prefijo no cuenta: /admins no es /admin.
  it('no matchea un prefijo a medias', () => {
    expect(moduleForPath('/admins')).toBeNull()
  })
})
