import { describe, expect, it } from 'vitest'
import cell from './index'

const STYLE = 'color:red;font-weight:600'
const CONTENT = 'Hello'
const RAW_MARKUP = '<b>already markup</b>'
const EMPTY = ''
const WRAPPED_CONTENT = `<td style="${STYLE}">${CONTENT}</td>`
const WRAPPED_RAW_MARKUP = `<td style="${STYLE}">${RAW_MARKUP}</td>`
const EMPTY_CELL = '<td style=""></td>'

describe('cell', () => {
  it('wraps the content in a td carrying the given inline style', () => {
    expect(cell(STYLE, CONTENT)).toBe(WRAPPED_CONTENT)
  })

  it('does not escape or alter the content itself', () => {
    expect(cell(STYLE, RAW_MARKUP)).toBe(WRAPPED_RAW_MARKUP)
  })

  it('renders an empty style attribute and empty content without inserting "undefined"', () => {
    expect(cell(EMPTY, EMPTY)).toBe(EMPTY_CELL)
  })
})
