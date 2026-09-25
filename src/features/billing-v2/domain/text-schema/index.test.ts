import { expect, it } from 'vitest'
import text from './index'

const BLANKS = [
  '\u0009', '\u000a', '\u000b', '\u000c', '\u000d', ' ', ' ',
  ' ', ' ', ' ', ' ', ' ', ' ', ' ',
  ' ', '　', '﻿',
]
const NOTE = 'first line\n\tsecond line\n\nfourth'

it('pins the whitespace set to the one JS trim uses, which is the one SQL repeats', () => {
  for (const blank of BLANKS) expect(blank.trim()).toBe('')
  expect('᠎'.trim()).not.toBe('')
})

it('refuses required text that is empty or blank in any of those characters', () => {
  expect(text.required.safeParse('').success).toBe(false)
  for (const blank of BLANKS) {
    expect(text.required.safeParse(blank.repeat(3)).success).toBe(false)
  }
  expect(text.required.safeParse(BLANKS.join('')).success).toBe(false)
})

it('preserves a genuine multiline note character for character', () => {
  expect(text.required.parse(NOTE)).toBe(NOTE)
  expect(text.optional.parse(NOTE)).toBe(NOTE)
})

it('normalizes blank optional input to null and leaves real text alone', () => {
  expect(text.optional.parse(null)).toBeNull()
  expect(text.optional.parse('')).toBeNull()
  for (const blank of BLANKS) expect(text.optional.parse(blank)).toBeNull()
  expect(text.optional.parse(' kept ')).toBe(' kept ')
})

it('refuses a missing value on both, so an absent key is never a silent null', () => {
  expect(text.required.safeParse(undefined).success).toBe(false)
  expect(text.optional.safeParse(undefined).success).toBe(false)
  expect(text.required.safeParse(null).success).toBe(false)
})
