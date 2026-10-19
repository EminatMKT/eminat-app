import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Pendiente } from '@/shared/dedup/types'
import DuplicatesTab from './index'
import pendienteFixture from './pendienteFixture'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

// The two hooks are stubbed so a test can put either one in its failed state: their effects
// never run under `renderToStaticMarkup`, so a real failure could not be reached from here.
const fallas = vi.hoisted(() => {
  const pendientes: Pendiente[] = []
  const summaries: Record<string, string> = {}
  const state = {
    lista: false,
    par: false,
    pendientes,
    summaries,
    namesLoading: false,
  }
  return state
})
vi.mock('./useListaDuplicados', () => ({ default: listaStub }))
vi.mock('./useAbrirPendiente', () => ({ default: parStub }))

function listaStub() {
  const lista = {
    pendientes: fallas.pendientes,
    summaries: fallas.summaries,
    namesLoading: fallas.namesLoading,
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
    excludedIds: [],
    onToggleExcluded: () => {},
    error: fallas.par,
    abrirPendiente: () => {},
    cerrarPendiente: () => {},
    onElegir: () => {},
    controls: {
      choices: {},
      onChoose: () => {},
      excludedIds: [],
      onToggleExcluded: () => {},
    },
  }
  return par
}

type Item = { id: string }

const anaOnly = { a: 'Ana Lopez' }

const renderTab = () => renderToStaticMarkup(
  <DuplicatesTab<Item>
    entidad="pacientes"
    cargarItem={async id => ({ id })}
    renderResumen={item => item.id}
    renderComparacion={() => null}
    construirValoresFinales={() => ({})}
    loadSummaries={async () => ({})}
  />,
)

describe('DuplicatesTab', () => {
  beforeEach(() => {
    fallas.lista = false
    fallas.par = false
    fallas.pendientes = []
    fallas.summaries = {}
    fallas.namesLoading = false
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

  it('names each pending pair, says when a name is still loading, and when it could not load', () => {
    fallas.pendientes = [pendienteFixture()]
    fallas.summaries = anaOnly
    fallas.namesLoading = true
    expect(renderTab()).toContain('dedup.nameLoading')
    fallas.namesLoading = false
    const html = renderTab()
    expect(html).toContain('Ana Lopez')
    expect(html).toContain('dedup.nameUnavailable')
  })
})
