import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SectionCard from './index'

const draw = () => renderToStaticMarkup(<SectionCard title="42" subtitle="Open invoices">99</SectionCard>)

describe('SectionCard', () => {
  it('renders title subtitle and children', () => {
    const html = draw()
    expect(html).toContain('42')
    expect(html).toContain('Open invoices')
    expect(html).toContain('99')
  })
})
