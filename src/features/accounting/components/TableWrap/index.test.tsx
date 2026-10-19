import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Td from '../Td'
import Tr from '../Tr'
import s from './index.module.css'
import TableWrap from './index'

vi.mock('./index.module.css', () => ({ default: { wrap: 'scroll-wrap', table: 'full-width' } }))

const TOTAL = 9800

const row = () => <Tr><Td>{TOTAL}</Td></Tr>
const draw = () => renderToStaticMarkup(<TableWrap>{row()}</TableWrap>)

describe('TableWrap', () => {
  it('puts the rows inside a scroll wrapper and a full-width grid', () => {
    const html = draw()
    expect(html).toContain(`class="${s.wrap}"`)
    expect(html).toContain(`class="${s.table}"`)
    expect(html).toContain(renderToStaticMarkup(row()))
  })
})
