import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TopbarBrands from './index'

type Brand = { codigo: string; color: string | null }

const FIRST = 'EMC'
const SECOND = 'SVN'
const TINT = 'teal'
const brands = vi.hoisted(() => {
  const list: Brand[] = []
  return { list }
})

vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ marcas: brands.list }) }))
vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string, vars: Record<string, string | number>) => `${key}:${Object.values(vars).join('|')}` }),
}))

beforeEach(() => { brands.list = [{ codigo: FIRST, color: TINT }, { codigo: SECOND, color: null }] })

describe('TopbarBrands', () => {
  // A wide screen keeps one chip per brand, each in its own color.
  it('draws every brand by its code', () => {
    const html = renderToStaticMarkup(<TopbarBrands />)
    expect(html).toContain(FIRST)
    expect(html).toContain(SECOND)
    expect(html).toContain(TINT)
  })

  // On a phone the row folds into one count; the brands it stands for are its hint, not lost.
  it('adds a count of the brands whose hint names every one', () => {
    const html = renderToStaticMarkup(<TopbarBrands />)
    expect(html).toContain('shell.brandsMore:2')
    expect(html).toContain(`shell.brandsTitle:${FIRST}, ${SECOND}`)
  })

  // With no brand there is nothing to count: a "+0" chip would say something false.
  it('draws nothing when the group offers no brand', () => {
    brands.list = []
    expect(renderToStaticMarkup(<TopbarBrands />)).toBe('')
  })
})
