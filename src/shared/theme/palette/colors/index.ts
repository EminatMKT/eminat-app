import type { CSSProperties } from 'react'
import type { Theme, ThemeName } from '@/shared/theme/types'

const colors: Record<ThemeName, Omit<Theme, 'accent' | 'inputStyle'>> = {
  light: {
    bg: '#F9FAFB',
    s1: '#FFFFFF',
    s2: '#FFFFFF',
    s3: '#F3F4F6',
    border: '#E5E7EB',
    t1: '#111827',
    t2: '#6B7280',
    t3: '#9CA3AF',
  },
  dark: {
    bg: '#101017',
    s1: '#13131C',
    s2: '#13131C',
    s3: '#191923',
    border: 'rgba(255,255,255,0.07)',
    t1: '#FFFFFF',
    t2: 'rgba(255,255,255,0.65)',
    t3: 'rgba(255,255,255,0.35)',
  },
}

const inputOverrides: Record<ThemeName, Pick<CSSProperties, 'border' | 'background' | 'color'>> = {
  light: { border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827' },
  dark: { border: '1px solid rgba(255,255,255,0.12)', background: '#191923', color: '#FFFFFF' },
}

const rawColors = { colors, inputOverrides }

export default rawColors

// Raw per-theme colors (light keeps the app's current hex values; dark is the Launchpad's `D`
// palette) and the input-field overrides each theme needs on top of ../index's shared baseInput.
