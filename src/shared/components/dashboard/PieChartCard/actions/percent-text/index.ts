import { createElement } from 'react'

const SVG_TEXT = 'text'

function percentText(x: number, vertical: number, percent: number, className: string) {
  const textProps = {
    x,
    y: vertical,
    textAnchor: 'middle',
    dominantBaseline: 'middle',
    className,
  }
  return createElement(SVG_TEXT, textProps, `${percent}%`)
}

export default percentText

// The module draws the SVG percentage text for a pie slice.
