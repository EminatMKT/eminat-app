import { describe, it, expect } from 'vitest'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CalendarBox from './index'

const PARTS: ComponentProps<typeof CalendarBox>['part'][] = ['page', 'nav', 'title', 'grid', 'day', 'entries', 'open']
const CONTENT = 'x'
const classOf = (part: ComponentProps<typeof CalendarBox>['part']) => {
  const html = renderToStaticMarkup(<CalendarBox part={part}>{CONTENT}</CalendarBox>)
  const found = /class="([^"]*)"/.exec(html)
  return found?.[1]
}

describe('CalendarBox', () => {
  // One box with a skin per part instead of a wrapper each: they are the same element and only
  // differ in how they lay out what is inside, which is the whole reason they are one file.
  it('gives each part of the page its own class', () => {
    const classes = new Set(PARTS.map(classOf))
    expect(classes.size).toBe(PARTS.length)
  })

  it('draws nothing of its own: only what it was handed', () => {
    expect(renderToStaticMarkup(<CalendarBox part="day">30</CalendarBox>)).toContain('30')
  })
})
