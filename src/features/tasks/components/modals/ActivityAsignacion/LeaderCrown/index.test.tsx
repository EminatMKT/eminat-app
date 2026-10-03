import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import LeaderCrown from './index'

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string, vars?: object) => [key, ...Object.values(vars ?? {})].join(':') }),
}))

const NAME = 'Ana'

describe('LeaderCrown', () => {
  it('offers to make the person leader while they are not', () => {
    const html = renderToStaticMarkup(<LeaderCrown name={NAME} leads={false} onCrown={vi.fn()} />)
    expect(html).toContain(`aria-label="tasks.responsibles.makeLeaderAria:${NAME}"`)
    expect(html).toContain('aria-pressed="false"')
  })

  it('pressed, it offers to remove the leadership and says the person leads', () => {
    const html = renderToStaticMarkup(<LeaderCrown name={NAME} leads onCrown={vi.fn()} />)
    expect(html).toContain(`aria-label="tasks.responsibles.removeLeaderAria:${NAME}"`)
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('tasks.responsibles.leaderText')
  })
})
