import { describe, it, expect, vi } from 'vitest'
import { esDelCatalogo, soloDelCatalogo } from './index'

const TABS = ['overview', 'kanban', 'reporte'] as const

describe('esDelCatalogo', () => {
  it('reconoce un valor del catálogo', () => {
    expect(esDelCatalogo(TABS)('kanban')).toBe(true)
  })

  it('rechaza uno que no está, incluido el que sólo se le parece', () => {
    expect(esDelCatalogo(TABS)('kanbam')).toBe(false)
    expect(esDelCatalogo(TABS)('')).toBe(false)
  })
})

describe('soloDelCatalogo', () => {
  it('aplica el valor cuando pertenece', () => {
    const aplicar = vi.fn()
    soloDelCatalogo(TABS, aplicar)('reporte')
    expect(aplicar).toHaveBeenCalledWith('reporte')
  })

  it('NO aplica nada cuando no pertenece: es lo que evita guardar un valor inválido', () => {
    const aplicar = vi.fn()
    soloDelCatalogo(TABS, aplicar)('otra-cosa')
    expect(aplicar).not.toHaveBeenCalled()
  })
})
