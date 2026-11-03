import { describe, expect, it } from 'vitest'
import noteLines from '.'

describe('noteLines', () => {
  it('fits more lines in a tall normal-size block than in a short compact one', () => {
    const compactLines = noteLines(30, true)
    const tallLines = noteLines(200, false)

    expect(tallLines).toBeGreaterThan(compactLines)
  })

  it('never returns fewer than one line, even for a block too short to fit the note at all', () => {
    expect(noteLines(1, true)).toBe(1)
    expect(noteLines(1, false)).toBe(1)
  })

  it('grows as the block gets taller, holding compactness fixed', () => {
    const shorter = noteLines(60, false)
    const taller = noteLines(120, false)

    expect(taller).toBeGreaterThanOrEqual(shorter)
  })
})
