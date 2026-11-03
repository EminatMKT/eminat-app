import {
  describe,
  it,
  expect,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PersonSummary from './index'

describe('PersonSummary', () => {
  it('renders the name and subtitle', () => {
    const html = renderToStaticMarkup(
      <PersonSummary
        initials="AL"
        size="md"
        name="Ana López"
        subtitle="Marketing"
      />,
    )

    expect(html).toContain('Ana López')
    expect(html).toContain('Marketing')
  })

  it('omits the subtitle row when none is given', () => {
    const html = renderToStaticMarkup(
      <PersonSummary
        initials="AL"
        size="md"
        name="Ana López"
      />,
    )

    expect(html).toContain('Ana López')
  })

  it('renders through the shared Avatar', () => {
    const html = renderToStaticMarkup(
      <PersonSummary
        initials="AL"
        size="md"
        name="Ana López"
      />,
    )

    expect(html).toContain('AL')
  })
})
