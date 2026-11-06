import { describe, expect, it } from 'vitest'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import blockGeometry from '.'

const PX_PER_MIN = 2
const MIDNIGHT_START = '23:30'
const MIDNIGHT_END = '24:00'
const TOP_KEY = '--block-top'
const HEIGHT_KEY = '--block-height'
const MIDNIGHT_TOP = '2820px'
const MIDNIGHT_HEIGHT = '60px'

const range = (startsAt: string, endsAt: string): WeeklyAvailabilityRange => ({
  weekday: 1,
  startsAt,
  endsAt,
})

describe('blockGeometry', () => {
  it('positions the block from the range start in minutes', () => {
    const geometry = blockGeometry(range('09:00', '13:00'), PX_PER_MIN)

    expect(geometry.style['--block-top']).toBe('1080px')
  })

  it('sizes the block from the range duration in minutes', () => {
    const geometry = blockGeometry(range('09:00', '13:00'), PX_PER_MIN)

    expect(geometry.style['--block-height']).toBe('480px')
  })

  it('marks a range of 30 minutes or less as compact', () => {
    expect(blockGeometry(range('09:00', '09:30'), PX_PER_MIN).compact).toBe(true)
  })

  it('renders the final half hour through midnight as compact', () => {
    const midnightRange = range(MIDNIGHT_START, MIDNIGHT_END)
    const geometry = blockGeometry(midnightRange, PX_PER_MIN)

    expect(geometry.style[TOP_KEY]).toBe(MIDNIGHT_TOP)
    expect(geometry.style[HEIGHT_KEY]).toBe(MIDNIGHT_HEIGHT)
    expect(geometry.compact).toBe(true)
  })

  it('marks a range longer than 30 minutes as not compact', () => {
    expect(blockGeometry(range('09:00', '10:00'), PX_PER_MIN).compact).toBe(false)
  })

  it('sets more note lines on a tall block than on a compact one', () => {
    const compact = blockGeometry(range('09:00', '09:30'), PX_PER_MIN)
    const tall = blockGeometry(range('09:00', '17:00'), PX_PER_MIN)

    expect(Number(tall.style['--note-lines'])).toBeGreaterThan(Number(compact.style['--note-lines']))
  })
})
