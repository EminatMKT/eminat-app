import type { CSSProperties } from 'react'

/** Token set for the themed content area (sidebar/topbar stay dark, see ../tokens). */
export type Theme = {
  bg: string
  s1: string
  s2: string
  s3: string
  border: string
  t1: string
  t2: string
  t3: string
  accent: string
  inputStyle: CSSProperties
}

/** Name of a registered theme; THEME_ORDER (../tokens) defines the toggle's cycle order. */
export type ThemeName = 'light' | 'dark'

// Shapes shared by the theme module: the token set a palette provides, and the closed set
// of names a palette can be registered under.
