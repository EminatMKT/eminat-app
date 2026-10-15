import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import DuplicatesTab from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

type Item = { id: string }

const cargarItem = async (id: string): Promise<Item> => ({ id })
const renderResumen = (item: Item): string => item.id
const renderDetalle = (): null => null

describe('DuplicatesTab', () => {
  // The effect that fetches `duplicados_pendientes` never runs under `renderToStaticMarkup`, so
  // this only asserts the render before any network round trip — a smoke test, not a fetch test.
  it('shows the empty state before any pair has loaded', () => {
    const html = renderToStaticMarkup(
      <DuplicatesTab entidad="pacientes" cargarItem={cargarItem}
        renderResumen={renderResumen} renderComparacion={renderDetalle} />,
    )

    expect(html).toContain('dedup.emptyState')
  })

  it('does not show the comparison panel until a pair is opened', () => {
    const html = renderToStaticMarkup(
      <DuplicatesTab entidad="pacientes" cargarItem={cargarItem}
        renderResumen={renderResumen} renderComparacion={renderDetalle} />,
    )

    expect(html).not.toContain('dedup.mergeFailed')
  })
})
