import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CalendarBox from './index'

type Box = ReactElement<{ className: string }>
const classOf = (part: 'page' | 'nav' | 'grid' | 'day') =>
  (CalendarBox({ part, children: 'x' }) as Box).props.className

describe('CalendarBox', () => {
  // One box with four skins instead of four wrappers: the four are the same element and only
  // differ in how they lay out what is inside, which is the whole reason they are one file.
  it('gives each part of the page its own class', () => {
    const classes = new Set([classOf('page'), classOf('nav'), classOf('grid'), classOf('day')])
    expect(classes.size).toBe(4)
  })

  it('draws nothing of its own: only what it was handed', () => {
    expect(renderToStaticMarkup(<CalendarBox part="day">30</CalendarBox>)).toContain('30')
  })
})
