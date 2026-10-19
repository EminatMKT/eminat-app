import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import renderPreview from '.'

vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))

const t = (key: string) => key
const HEADING = 'dedup.willBeSaved'
const SEGURO = { seguro: 'Cigna' }
const ONLY_UNLABELLED = { id: 'p1' }
const draw = (values: Record<string, unknown>) => renderToStaticMarkup(<>{renderPreview(values, t)}</>)

describe('renderPreview', () => {
  it('draws a headed box with each field the merge will save', () => {
    const html = draw(SEGURO)
    expect(html).toContain(HEADING)
    expect(html).toContain('med.field.seguro')
    expect(html).toContain('Cigna')
  })

  it('draws nothing when the merge writes no field the reviewer would recognise', () => {
    expect(draw(ONLY_UNLABELLED)).toBe('')
  })
})
