import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ActivityAssignment from './index'

const marcas = [{ codigo: 'EMC', nombre: 'Medical' }, { codigo: 'SVN', nombre: 'Servi-Net' }]
const miembrosAsignables = [{ id: 'a', nombre: 'Ana' }]
const responsables = [{ usuario_id: 'a', es_lider: true }]
const labelOf = (brand: typeof marcas[number]) => `${brand.codigo} — ${brand.nombre}`

let offered = marcas

vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ marcas: offered, miembrosAsignables, esAdmin: true }) }))
vi.mock('@/features/tasks/components/TasksContext', () => ({
  useTasks: () => ({ nuevaAct: { empresa: 'EMC', project_id: '', responsables }, setNuevaAct: vi.fn() }),
}))
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

describe('ActivityAssignment', () => {
  beforeEach(() => { offered = marcas })

  it('offers every brand after the blank placeholder, with the saved one selected', () => {
    const html = renderToStaticMarkup(<ActivityAssignment />)
    expect(html).toContain('value="">stratix.new.select')
    expect(html).toContain('value="EMC" selected=""')
    marcas.forEach(brand => expect(html).toContain(labelOf(brand)))
    expect(html).not.toContain('stratix.new.noBrands')
  })

  it('with no brand to offer, says so in a disabled option after the placeholder', () => {
    offered = []
    const html = renderToStaticMarkup(<ActivityAssignment />)
    expect(html).toContain('value="">stratix.new.select')
    expect(html).toMatch(/<option[^>]*disabled=""[^>]*>stratix\.new\.noBrands<\/option>/)
  })

  it('shows one primary and a separate collaborator picker', () => {
    const html = renderToStaticMarkup(<ActivityAssignment />)
    expect(html).toContain('Responsable principal')
    expect(html).toContain('Colaboradores')
    expect(html).toContain('value="a" selected=""')
  })

  it('shows Project beside the brand', () => {
    const html = renderToStaticMarkup(<ActivityAssignment />)
    expect(html).toContain('Project')
  })
})
