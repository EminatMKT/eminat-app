import { describe, expect, it } from 'vitest'
import { COMPACT_SIZE, NORMAL_SIZE } from '../constants'
import noteLines from '.'

describe('noteLines', () => {
  it('fits more lines in a tall normal-size block than in a short compact one', () => {
    const compactLines = noteLines(30, COMPACT_SIZE)
    const tallLines = noteLines(200, NORMAL_SIZE)

    expect(tallLines).toBeGreaterThan(compactLines)
  })

  it('never returns fewer than one line, even for a block too short to fit the note at all', () => {
    expect(noteLines(1, COMPACT_SIZE)).toBe(1)
    expect(noteLines(1, NORMAL_SIZE)).toBe(1)
  })

  it('grows as the block gets taller, holding compactness fixed', () => {
    const shorter = noteLines(60, NORMAL_SIZE)
    const taller = noteLines(120, NORMAL_SIZE)

    expect(taller).toBeGreaterThanOrEqual(shorter)
  })
})
