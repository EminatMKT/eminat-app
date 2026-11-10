import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Avatar from './index'

const initials = 'AB'
const singleInitial = 'K'

describe('Avatar', () => {
  it('renders the initials', () => {
    const html = renderToStaticMarkup(<Avatar initials={initials} size="md" />)

    expect(html).toContain(initials)
  })

  it('applies the solid tone by default', () => {
    const html = renderToStaticMarkup(
      <Avatar initials={initials} size="lg" color="var(--c-danger-solid)" />,
    )

    expect(html).toContain(initials)
  })

  it('applies the tint tone when requested', () => {
    const html = renderToStaticMarkup(
      <Avatar initials={singleInitial} size="sm" tone="tint" color="var(--c-danger-solid)" />,
    )

    expect(html).toContain(singleInitial)
  })

  it('omits the status dot when none is given', () => {
    const html = renderToStaticMarkup(<Avatar initials="AB" size="md" />)

    expect(html.match(/<span/g)?.length).toBe(1)
  })

  it('renders a status dot when given', () => {
    const html = renderToStaticMarkup(<Avatar initials="AB" size="md" status="online" />)

    expect(html.match(/<span/g)?.length).toBe(2)
  })

  it('falls back to the accent color when color is empty or missing', () => {
    const htmlEmpty = renderToStaticMarkup(<Avatar initials="AB" size="md" color="" />)
    const htmlMissing = renderToStaticMarkup(<Avatar initials="AB" size="md" />)

    expect(htmlEmpty).toBe(htmlMissing)
  })
})
