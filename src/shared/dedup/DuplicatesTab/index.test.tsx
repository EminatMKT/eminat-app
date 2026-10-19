import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Pendiente } from '@/shared/dedup/types'
import type { Props } from './types'
import type { Props as PairProps } from './PairDetail/types'
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
    abierto: false,
  }
  return state
})
vi.mock('./useListaDuplicados', () => ({ default: listaStub }))
vi.mock('./useAbrirPendiente', () => ({ default: parStub }))

// `PairDetail` has its own suite; here only the preview it is handed matters.
const pairSeen = vi.hoisted(() => {
  const calls: Partial<PairProps<Item>>[] = []
  return calls
})
vi.mock('./PairDetail', () => ({
  default: (props: Partial<PairProps<Item>>) => { pairSeen.push(props); return null },
}))

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
  const open = fallas.abierto
  const par = {
    abierto: open ? pendienteFixture() : null,
    itemA: open ? WINNER : null,
    itemB: open ? LOSER : null,
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

const WINNER: Item = { id: 'a' }
const LOSER: Item = { id: 'b' }
const anaOnly = { a: 'Ana Lopez' }
const NO_EXTRA: Partial<Props<Item>> = {}
const mergeValues = (a: Item, b: Item) => ({ kept: a.id, merged: b.id })
// Echoes the pair too: multivalued survivors are read from the items, not from `values`.
const previewOf = (a: Item, b: Item, values: Record<string, unknown>) => {
  const echoed = [a.id, b.id, ...Object.values(values)]
  return String(echoed)
}

const renderTab = (extra = NO_EXTRA) => renderToStaticMarkup(
  <DuplicatesTab<Item>
    entidad="pacientes"
    cargarItem={async id => ({ id })}
    renderResumen={item => item.id}
    renderComparacion={() => null}
    construirValoresFinales={mergeValues}
    loadSummaries={async () => ({})}
    {...extra}
  />,
)
const PREVIEW_PROPS: Partial<Props<Item>> = { renderPreview: previewOf }

describe('DuplicatesTab', () => {
  beforeEach(() => {
    fallas.lista = false
    fallas.par = false
    fallas.pendientes = []
    fallas.summaries = {}
    fallas.namesLoading = false
    fallas.abierto = false
    pairSeen.length = 0
  })

  // The preview reads the same `construirValoresFinales` the merge sends, so it cannot drift.
  it('hands the open pair a preview of exactly the values the merge would save', () => {
    fallas.abierto = true
    renderTab(PREVIEW_PROPS)
    expect(pairSeen[0].preview).toBe(previewOf(WINNER, LOSER, mergeValues(WINNER, LOSER)))
  })

  it('hands the open pair no preview when the caller draws none', () => {
    fallas.abierto = true
    renderTab()
    expect(pairSeen[0].preview).toBeNull()
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
