import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ChecklistChoice from './index'

const noop = () => undefined
const ACTION_LABEL = 'Toggle Ana'
const ACTION_ATTR = `aria-label="${ACTION_LABEL}"`

describe('ChecklistChoice', () => {
  it('renders a checked option with a pressed action', () => {
    const html = renderToStaticMarkup(
      <ChecklistChoice checked label="Ana" onChecked={noop}
        actionIcon="♕" actionLabel="Toggle Ana" actionPressed onAction={noop} />,
    )
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('checked=""')
    expect(html).toContain(ACTION_ATTR)
    expect(html).toContain('aria-pressed="true"')
  })

  it('does not render the action for unchecked options', () => {
    const html = renderToStaticMarkup(
      <ChecklistChoice checked={false} label="Ana" onChecked={noop}
        actionIcon="♕" actionLabel="Toggle Ana" actionPressed={false} onAction={noop} />,
    )
    expect(html).not.toContain('aria-pressed')
    expect(html).not.toContain('Toggle Ana')
  })
})
