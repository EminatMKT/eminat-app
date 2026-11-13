import palette from '@/shared/theme/palette'
import type { Props, AvatarStyle } from './types'
import s from './index.module.css'

const DEFAULT_SWATCH = palette.accentVar

function resolveSwatch(color?: string | null): string {
  const trimmed = color?.trim()

  return trimmed ? trimmed : DEFAULT_SWATCH
}

const DOT_SIZE_CLASS = {
  sm: 'dotSm',
  md: 'dotMd',
  lg: 'dotLg',
  xl: 'dotXl',
} as const

/** Circular badge with initials, a resolved color, a size, a solid/tint tone, and an optional
 *  status dot — every string and color arrives already resolved by the caller. */
export default function Avatar({
  initials,
  size,
  color,
  tone = 'solid',
  status,
  className,
}: Props) {
  const vars: AvatarStyle = { '--swatch': resolveSwatch(color) }
  const extraClass = className ? ` ${className}` : ''
  const classes = `${s.avatar} ${s[size]} ${s[tone]}${extraClass}`
  const dotClass = status ? `${s.dot} ${s[DOT_SIZE_CLASS[size]]} ${s[status]}` : null

  return (
    <span className={classes} style={vars}>
      {initials}
      {dotClass && <span className={dotClass} />}
    </span>
  )
}

// Presentation-only: every consumer resolves its own initials and color before calling this, so
// Avatar never touches i18n or domain logic, only visual composition.
