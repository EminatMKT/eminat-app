import type { CSSProperties } from 'react'

export type Props = {
  name: string
  value: number
  total: number
  color: string
  formatValue?: (v: number) => string
}

export type DotStyle = CSSProperties & { '--dot': string }

// The module exports the LegendItem contract and its CSS custom-property style.
