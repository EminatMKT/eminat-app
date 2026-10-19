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

const names: [string, string] = ['Ana Lopez', 'Ana P. Lopez']
const partialLevel = { nivel: 'parcial' as const }

describe('ParDuplicado', () => {
  it('names the exact level for an exact match', () => {
    const html = renderToStaticMarkup(<ParDuplicado par={pendienteFixture()} names={names} onAbrir={vi.fn()} />)
    expect(html).toContain('dedup.levelExact')
  })

  it('names the partial level for a partial match', () => {
    const parcial = pendienteFixture(partialLevel)
    const html = renderToStaticMarkup(<ParDuplicado par={parcial} names={names} onAbrir={vi.fn()} />)
    expect(html).toContain('dedup.levelPartial')
  })

  it('names both records, on screen and in the row’s accessible name', () => {
    const html = renderToStaticMarkup(<ParDuplicado par={pendienteFixture()} names={names} onAbrir={vi.fn()} />)
    expect(html).toContain('Ana P. Lopez')
    expect(html).toContain('dedup.openPairAria')
  })
})
