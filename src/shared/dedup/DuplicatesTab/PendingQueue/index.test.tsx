import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PendingQueue from '.'
import pendienteFixture from '../pendienteFixture'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

const emptyQueue = {
  pendientes: [],
  summaries: {},
  namesLoading: false,
  error: false,
}
const namedQueue = {
  ...emptyQueue,
  pendientes: [pendienteFixture()],
  summaries: { a: 'Ana Lopez' },
}

describe('PendingQueue', () => {
  it('says nothing is pending once an empty list loaded', () => {
    const html = renderToStaticMarkup(<PendingQueue list={emptyQueue} onOpen={vi.fn()} />)
    expect(html).toContain('dedup.emptyState')
  })

  it('names a loaded record and marks the one whose name did not load', () => {
    const html = renderToStaticMarkup(<PendingQueue list={namedQueue} onOpen={vi.fn()} />)
    expect(html).toContain('Ana Lopez')
    expect(html).toContain('dedup.nameUnavailable')
  })
})
