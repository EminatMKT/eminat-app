import {
  describe,
  it,
  expect,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PersonSummary from './index'

const personName = 'Ana López'
const personSubtitle = 'Marketing'
const personInitials = 'AL'

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

    expect(html).toContain(personName)
    expect(html).toContain(personSubtitle)
  })

  it('omits the subtitle row when none is given', () => {
    const html = renderToStaticMarkup(
      <PersonSummary
        initials="AL"
        size="md"
        name="Ana López"
      />,
    )

    expect(html).toContain(personName)
  })

  it('renders through the shared Avatar', () => {
    const html = renderToStaticMarkup(
      <PersonSummary
        initials="AL"
        size="md"
        name="Ana López"
      />,
    )

    expect(html).toContain(personInitials)
  })
})
