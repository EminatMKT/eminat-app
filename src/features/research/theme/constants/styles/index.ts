import type { CSSProperties } from 'react'

/** Static form-field style, not theme-reactive yet — out of scope for the toggle. */
export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: '#111827',
  fontSize: 13,
  fontFamily: 'DM Sans',
  outline: 'none',
}

/** Compact variant of `inputStyle` for `<select>` fields. */
export const selectStyle: CSSProperties = {
  ...inputStyle,
  width: 'auto',
  padding: '6px 12px',
  fontSize: 12,
}

// Owns the two static form-field styles Research still uses outside the theme toggle.
