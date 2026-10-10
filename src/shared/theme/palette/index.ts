import type { CSSProperties } from 'react'
import type { ThemeName } from '@/shared/theme/types'
import rawColors from './colors'

const accent = '#7C6FF7'
const baseInput: CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  fontSize: 13,
  fontFamily: 'DM Sans',
  outline: 'none',
}

const order: ThemeName[] = ['light', 'dark']
const palette = {
  accent,
  baseInput,
  colors: rawColors.colors,
  inputOverrides: rawColors.inputOverrides,
  order,
}

export default palette

// Theme-agnostic defaults (accent, base input, toggle order) plus the raw per-theme colors
// from ./colors; ../tokens combines all of it into the full Theme objects the app consumes.
