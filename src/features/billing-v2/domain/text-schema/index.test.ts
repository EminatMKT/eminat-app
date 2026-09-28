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

const MAX = 100
const required = text.required(MAX)
const optional = text.optional(MAX)

it('refuses required text that is empty or blank in any of those characters', () => {
  expect(required.safeParse('').success).toBe(false)
  for (const blank of BLANKS) {
    expect(required.safeParse(blank.repeat(3)).success).toBe(false)
  }
  expect(required.safeParse(BLANKS.join('')).success).toBe(false)
})

it('preserves a genuine multiline note character for character', () => {
  expect(required.parse(NOTE)).toBe(NOTE)
  expect(optional.parse(NOTE)).toBe(NOTE)
})

it('normalizes blank optional input to null and leaves real text alone', () => {
  expect(optional.parse(null)).toBeNull()
  expect(optional.parse('')).toBeNull()
  for (const blank of BLANKS) expect(optional.parse(blank)).toBeNull()
  expect(optional.parse(' kept ')).toBe(' kept ')
})

it('refuses a missing value on both, so an absent key is never a silent null', () => {
  expect(required.safeParse(undefined).success).toBe(false)
  expect(optional.safeParse(undefined).success).toBe(false)
  expect(required.safeParse(null).success).toBe(false)
})

// The column has a CHECK on the same number: one character more is refused here, not there.
it('refuses text longer than the limit of the column it is stored in', () => {
  const full = 'x'.repeat(MAX)
  expect(required.parse(full)).toBe(full)
  expect(optional.parse(full)).toBe(full)
  expect(required.safeParse(`${full}x`).success).toBe(false)
  expect(optional.safeParse(`${full}x`).success).toBe(false)
})
