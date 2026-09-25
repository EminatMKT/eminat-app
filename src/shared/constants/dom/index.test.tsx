import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Pressable from '@/shared/components/ui/Pressable'
import { BUTTON } from './index'

const ignore = () => undefined
const LABEL = 'Day 30'

describe('dom names', () => {
  // A suite that counts the calendar's controls by BUTTON has to be counting what they draw.
  it('names the element a pressable surface draws', () => {
    const html = renderToStaticMarkup(<Pressable accessibleLabel={LABEL} onClick={ignore}>30</Pressable>)
    expect(html.startsWith(`<${BUTTON} `)).toBe(true)
  })
})
