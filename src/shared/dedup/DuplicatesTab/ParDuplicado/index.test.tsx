import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ParDuplicado from '.'
import type { Pendiente } from '@/shared/dedup/types'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

const par: Pendiente = {
  item_id_a: 'a',
  item_id_b: 'b',
  nivel: 'exacta',
  detectado_at: '2026-01-01T00:00:00Z',
}

describe('ParDuplicado', () => {
  it('names the exact level for an exact match', () => {
    const html = renderToStaticMarkup(<ParDuplicado par={par} onAbrir={vi.fn()} />)
    expect(html).toContain('dedup.levelExact')
  })

  it('names the partial level for a partial match', () => {
    const parcial: Pendiente = { ...par, nivel: 'parcial' }
    const html = renderToStaticMarkup(<ParDuplicado par={parcial} onAbrir={vi.fn()} />)
    expect(html).toContain('dedup.levelPartial')
  })
})
