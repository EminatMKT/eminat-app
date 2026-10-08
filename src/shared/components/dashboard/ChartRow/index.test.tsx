import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ChartRow from './index'

const LABEL_A = 'chart-a'
const LABEL_B = 'chart-b'
const LABEL_SOLO = 'chart-solo'

describe('ChartRow', () => {
  it('renders every child passed to it', () => {
    const html = renderToStaticMarkup(<ChartRow>{[LABEL_A, LABEL_B]}</ChartRow>)
    expect(html).toContain(LABEL_A)
    expect(html).toContain(LABEL_B)
  })

  it('renders a single child the same way', () => {
    const html = renderToStaticMarkup(<ChartRow>{LABEL_SOLO}</ChartRow>)
    expect(html).toContain(LABEL_SOLO)
  })
})
