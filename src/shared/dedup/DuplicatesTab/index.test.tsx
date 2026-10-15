import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import DuplicatesTab from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

// The two hooks are stubbed so a test can put either one in its failed state: their effects
// never run under `renderToStaticMarkup`, so a real failure could not be reached from here.
const fallas = vi.hoisted(() => ({ lista: false, par: false }))
vi.mock('./useListaDuplicados', () => ({ default: listaStub }))
vi.mock('./useAbrirPendiente', () => ({ default: parStub }))

function listaStub() {
  const lista = {
    pendientes: [],
    ocupado: false,
    error: fallas.lista,
    escanearPendientes: () => {},
    recargar: () => {},
  }
  return lista
}

function parStub() {
  const par = {
    abierto: null,
    itemA: null,
    itemB: null,
    elecciones: {},
    error: fallas.par,
    abrirPendiente: () => {},
    cerrarPendiente: () => {},
    onElegir: () => {},
  }
  return par
}

type Item = { id: string }

const renderTab = () => renderToStaticMarkup(
  <DuplicatesTab<Item>
    entidad="pacientes"
    cargarItem={async id => ({ id })}
    renderResumen={item => item.id}
    renderComparacion={() => null}
    construirValoresFinales={() => ({})}
  />,
)

describe('DuplicatesTab', () => {
  beforeEach(() => {
    fallas.lista = false
    fallas.par = false
  })

  it('shows the empty state before any pair has loaded', () => {
    expect(renderTab()).toContain('dedup.emptyState')
  })

  it('does not show the comparison panel until a pair is opened', () => {
    expect(renderTab()).not.toContain('dedup.mergeFailed')
  })

  // A failed list load or scan used to render the plain empty state, indistinguishable from
  // "nothing pending".
  it('says the list failed instead of claiming nothing is pending', () => {
    fallas.lista = true
    const html = renderTab()
    expect(html).toContain('dedup.listFailed')
    expect(html).not.toContain('dedup.emptyState')
  })

  it('says a pair could not be opened', () => {
    fallas.par = true
    expect(renderTab()).toContain('dedup.openFailed')
  })
})
