import { describe, it, expect } from 'vitest'
import limitGuard from './index'

const MAX = 120
const LONG = 'x'.repeat(200)
const SHORT = 'x'.repeat(10)
const HELD = 'y'.repeat(100)
const SELECTED = 30

/** A box as the browser hands it to a handler: its text and where the selection sits. */
const box = (value: string, selectionStart = value.length, selectionEnd = selectionStart) =>
  ({ value, selectionStart, selectionEnd })
const carrying = (text: string) => ({ getData: () => text })

/** What the guard reports for one paste into a box. */
function pasted(target: object, text: string) {
  const seen: number[] = []
  limitGuard(MAX, (cut) => seen.push(cut)).onPaste({ currentTarget: target, clipboardData: carrying(text) })
  return seen[0]
}

describe('limitGuard', () => {
  it('reports what a paste into an empty box loses', () => {
    expect(pasted(box(''), LONG)).toBe(LONG.length - MAX)
  })

  it('counts the selection a paste replaces as free room', () => {
    const lost = pasted(box(HELD, 0, SELECTED), HELD)
    expect(lost).toBe(HELD.length - SELECTED + HELD.length - MAX)
  })

  it('reports nothing lost when the paste fits', () => {
    expect(pasted(box(''), SHORT)).toBe(0)
  })

  // Dropped text lands at the pointer; the selection stays where it was.
  it('does not count a selection as replaced by a drop', () => {
    const seen: number[] = []
    const event = { currentTarget: box(HELD, 0, SELECTED), dataTransfer: carrying(HELD) }
    limitGuard(MAX, (cut) => seen.push(cut)).onDrop(event)
    expect(seen[0]).toBe(HELD.length + HELD.length - MAX)
  })

  it('reports a typed character the full box turns away', () => {
    const seen: number[] = []
    const full = box('z'.repeat(MAX))
    limitGuard(MAX, (cut) => seen.push(cut)).onBeforeInput({ currentTarget: full, data: SHORT })
    expect(seen[0]).toBe(SHORT.length)
  })
})
