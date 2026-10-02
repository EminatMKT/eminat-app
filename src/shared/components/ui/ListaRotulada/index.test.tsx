import { describe, expect, it } from 'vitest'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ListaRotulada from './index'

const draw = (props: ComponentProps<typeof ListaRotulada>) => renderToStaticMarkup(<ListaRotulada {...props} />)
const LIST_LABEL = 'People'
const LIST_NAME = `aria-label="${LIST_LABEL}"`

describe('ListaRotulada', () => {
  it('names the list and removes callers from drawing their own ul', () => {
    const html = draw({ label: 'People', children: 'Ana' })
    expect(html).toContain(LIST_NAME)
    expect(html).toContain('<ul')
    expect(html).toContain('Ana')
  })

  it('shows the empty message instead of a bare list when there are no rows', () => {
    const html = draw({ label: 'People', emptyLabel: 'Nobody matches' })
    expect(html).toContain('Nobody matches')
    expect(html).not.toContain('<ul')
  })
})
