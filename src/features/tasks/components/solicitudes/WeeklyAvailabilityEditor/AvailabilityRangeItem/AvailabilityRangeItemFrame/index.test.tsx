import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AvailabilityRangeItemFrame from './index'
import type { AvailabilityRangeItemFramePart } from './types'

const CONTENT = 'inside'
const ITEM_TAG = '<li'
const BOX_TAG = '<div'

const draw = (part: AvailabilityRangeItemFramePart) => {
  const frame = <AvailabilityRangeItemFrame part={part}>{CONTENT}</AvailabilityRangeItemFrame>

  return renderToStaticMarkup(frame)
}

describe('AvailabilityRangeItemFrame', () => {
  it('draws the item part as the list item root', () => {
    const html = draw('item')

    expect(html.startsWith(ITEM_TAG)).toBe(true)
    expect(html).toContain(CONTENT)
  })

  it('draws every other part as a plain box around its content', () => {
    expect(draw('times').startsWith(BOX_TAG)).toBe(true)
    expect(draw('removeWrap').startsWith(BOX_TAG)).toBe(true)
    expect(draw('removeWrap')).toContain(CONTENT)
  })
})
