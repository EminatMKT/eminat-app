import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import StatCard from './index'

const draw = (compact = false) => renderToStaticMarkup(<StatCard label="Revenue" value="$10" color="#abcdef" compact={compact} />)

describe('StatCard', () => {
  it('renders the KPI copy and color variable', () => {
    const html = draw()
    expect(html).toContain('Revenue')
    expect(html).toContain('$10')
    expect(html).toContain('--stat-color:#abcdef')
  })

  it('changes the class variant when compact', () => {
    expect(draw(true)).not.toBe(draw(false))
  })
})
