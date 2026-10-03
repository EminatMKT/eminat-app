import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Option from './index'

const noop = () => {}
const NAME = 'Alex'
const ID = 'option-1'
const ACTION = <i data-slot="action" />

describe('Option', () => {
  it('in a single combobox, selected means highlighted', () => {
    const html = renderToStaticMarkup(<Option id={ID} label={NAME} marked onPick={noop} />)
    expect(html).toContain('role="option"')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain(`>${NAME}<`)
  })

  it('in a multiple combobox, selected means checked, whatever the highlight', () => {
    const html = renderToStaticMarkup(<Option id={ID} label={NAME} marked checked={false} onPick={noop} />)
    expect(html).toContain('aria-selected="false"')
    expect(html).toContain(`aria-label="${NAME}"`)
  })

  it('draws the action slot next to the label', () => {
    const html = renderToStaticMarkup(<Option id={ID} label={NAME} marked={false} checked action={ACTION} onPick={noop} />)
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('data-slot="action"')
  })
})
