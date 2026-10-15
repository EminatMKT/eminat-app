import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PairDetail from '.'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

type Item = { id: string }

const itemA: Item = { id: 'a' }
const itemB: Item = { id: 'b' }
const renderResumen = (item: Item): string => item.id
const renderGrid = (): string => 'grid'

const renderDetalle = (errorDescarte: boolean, errorFusion: boolean) => renderToStaticMarkup(
  <PairDetail
    itemA={itemA}
    itemB={itemB}
    ocupado={false}
    errorDescarte={errorDescarte}
    errorFusion={errorFusion}
    renderResumen={renderResumen}
    renderComparacion={renderGrid}
    onElegir={vi.fn()}
    onCancelar={vi.fn()}
    onNotSame={vi.fn()}
    onKeepSeparate={vi.fn()}
    onFusionar={vi.fn()}
  />,
)

describe('PairDetail', () => {
  it('does not show a failure warning before any attempt', () => {
    const html = renderDetalle(false, false)
    expect(html).not.toContain('dedup.mergeFailed')
    expect(html).not.toContain('dedup.discardFailed')
  })

  it('shows the merge-failed warning once a merge attempt failed', () => {
    expect(renderDetalle(false, true)).toContain('dedup.mergeFailed')
  })

  // A failed discard used to show the merge copy, telling the reviewer to fix field choices.
  it('shows its own warning for a failed discard, not the merge one', () => {
    const html = renderDetalle(true, false)
    expect(html).toContain('dedup.discardFailed')
    expect(html).not.toContain('dedup.mergeFailed')
  })
})
