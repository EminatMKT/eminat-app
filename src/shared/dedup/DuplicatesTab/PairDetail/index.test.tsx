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

const renderDetalle = (error: boolean) => renderToStaticMarkup(
  <PairDetail
    itemA={itemA}
    itemB={itemB}
    ocupado={false}
    error={error}
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
  it('does not show a merge-failed warning before any attempt', () => {
    expect(renderDetalle(false)).not.toContain('dedup.mergeFailed')
  })

  it('shows the merge-failed warning once a merge attempt failed', () => {
    expect(renderDetalle(true)).toContain('dedup.mergeFailed')
  })
})
