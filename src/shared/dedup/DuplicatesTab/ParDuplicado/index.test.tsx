import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ParDuplicado from '.'
import pendienteFixture from '../pendienteFixture'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

describe('ParDuplicado', () => {
  it('names the exact level for an exact match', () => {
    const html = renderToStaticMarkup(<ParDuplicado par={pendienteFixture()} onAbrir={vi.fn()} />)
    expect(html).toContain('dedup.levelExact')
  })

  it('names the partial level for a partial match', () => {
    const parcial = pendienteFixture({ nivel: 'parcial' })
    const html = renderToStaticMarkup(<ParDuplicado par={parcial} onAbrir={vi.fn()} />)
    expect(html).toContain('dedup.levelPartial')
  })
})
