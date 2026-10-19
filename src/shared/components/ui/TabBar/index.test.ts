import {
  describe,
  expect,
  it,
} from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import TabBar from '.'

const TAB_TEXT = 'tab-one'
const TRAILING_TEXT = 'trailing-badge'

const renderBar = (trailing?: string) => {
  const props = { trailing, children: TAB_TEXT }
  return renderToStaticMarkup(createElement(TabBar, props))
}

describe('TabBar', () => {
  it('renders the tabs alone when no trailing slot is given', () => {
    const html = renderBar()
    expect(html).toContain(TAB_TEXT)
    expect(html).not.toContain(TRAILING_TEXT)
  })

  it('renders the trailing slot after the tabs', () => {
    const html = renderBar(TRAILING_TEXT)
    expect(html.indexOf(TRAILING_TEXT)).toBeGreaterThan(html.indexOf(TAB_TEXT))
  })
})
