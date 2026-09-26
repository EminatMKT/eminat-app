import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MAIN_ELEMENT } from '@/shared/constants/dom'
import ShellLayout from './index'

const PAGE = 'the page'
const MAIN_TAG = `<${MAIN_ELEMENT}`

type Part = Parameters<typeof ShellLayout>[0]['part']
const draw = (part: Part) => renderToStaticMarkup(<ShellLayout part={part}>{PAGE}</ShellLayout>)

describe('ShellLayout', () => {
  // The page's own content is the main landmark, and only it.
  it('draws the content as main', () => {
    const html = draw('content')
    expect(html.startsWith(MAIN_TAG)).toBe(true)
    expect(html).toContain(PAGE)
  })

  // The topbar sits in the column, beside main and not inside it: a header inside main is not a
  // banner, so neither the column nor the root may be main.
  it('keeps the column that holds the topbar out of main', () => {
    expect(draw('column')).not.toContain(MAIN_TAG)
    expect(draw('root')).not.toContain(MAIN_TAG)
  })
})
