import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ActivityAssignment from './index'

type Captured = { props?: Record<string, unknown> }

const { picker } = vi.hoisted(() => {
  const captured: Captured = {}
  return { picker: captured }
})
const marcas = [{ codigo: 'EMC', nombre: 'Medical' }, { codigo: 'SVN', nombre: 'Servi-Net' }]
const miembrosAsignables = [{ id: 'a', nombre: 'Ana' }]
const responsables = [{ usuario_id: 'a', es_lider: true }]
const labelOf = (brand: typeof marcas[number]) => `${brand.codigo} — ${brand.nombre}`

let offered = marcas

vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ marcas: offered, miembrosAsignables }) }))
vi.mock('@/features/tasks/components/TasksContext', () => ({
  useTasks: () => ({ nuevaAct: { empresa: 'EMC', responsables }, setNuevaAct: vi.fn() }),
}))
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('./ResponsiblesPicker', () => ({
  default: (props: Record<string, unknown>) => { picker.props = props; return null },
}))

describe('ActivityAssignment', () => {
  beforeEach(() => { picker.props = undefined; offered = marcas })

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

  it('hands the assignable members and the current responsables to the picker', () => {
    renderToStaticMarkup(<ActivityAssignment />)
    expect(picker.props?.members).toBe(miembrosAsignables)
    expect(picker.props?.rows).toBe(responsables)
  })

  it('labels the picker with the responsables label, beside the brand', () => {
    const html = renderToStaticMarkup(<ActivityAssignment />)
    expect(html).toContain('tasks.responsibles.label')
  })
})
