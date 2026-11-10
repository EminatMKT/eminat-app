import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ITEM_PART } from './constants'
import AvailabilityRangeItemFrame from './index'
import type { AvailabilityRangeItemFramePart } from './types'

const TIMES_PART: AvailabilityRangeItemFramePart = 'times'
const REMOVE_WRAP_PART: AvailabilityRangeItemFramePart = 'removeWrap'
const LIST_ITEM_TAG = 'li'
const BOX_TAG = 'div'
const RANGE_BODY = 'range body'
const ROOT_TAG = /^<([a-z]+)/

const draw = (part: AvailabilityRangeItemFramePart) => {
  const frame = <AvailabilityRangeItemFrame part={part}>{RANGE_BODY}</AvailabilityRangeItemFrame>

  return renderToStaticMarkup(frame)
}

const rootTagOf = (html: string) => ROOT_TAG.exec(html)?.[1]

describe('AvailabilityRangeItemFrame', () => {
  it('roots the item part in a list item that holds the range body', () => {
    const itemHtml = draw(ITEM_PART)

    expect(rootTagOf(itemHtml)).toBe(LIST_ITEM_TAG)
    expect(itemHtml).toContain(RANGE_BODY)
  })

  it('roots the times and remove parts in a plain box that holds the range body', () => {
    const timesHtml = draw(TIMES_PART)
    const removeHtml = draw(REMOVE_WRAP_PART)

    expect(rootTagOf(timesHtml)).toBe(BOX_TAG)
    expect(rootTagOf(removeHtml)).toBe(BOX_TAG)
    expect(removeHtml).toContain(RANGE_BODY)
  })
})
