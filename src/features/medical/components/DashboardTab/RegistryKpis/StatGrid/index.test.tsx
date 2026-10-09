import { expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import StatGrid from './index'
import type { Stat } from './types'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))

function render(stats: Stat[]) {
  return renderToStaticMarkup(<StatGrid className="grid" stats={stats} />)
}

it('renders one StatCard per stat, in order, with a footnote when given one', () => {
  const stats = [
    { label: 'Total', value: 500, color: 'var(--c-accent)' },
    {
      label: 'Reach',
      value: 300,
      color: 'var(--c-warn-solid)',
      footnote: 'note',
    },
  ]
  const html = render(stats)
  expect(html).toContain('Total')
  expect(html).toContain('Reach')
  expect(html).toContain('note')
})

it('renders nothing for an empty stat list', () => {
  expect(render([])).not.toContain('StatCard')
})
