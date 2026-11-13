import type { CSSProperties } from 'react'

export type Props = {
  initials: string
  size: 'sm' | 'md' | 'lg' | 'xl'
  color?: string | null
  tone?: 'solid' | 'tint'
  status?: 'online' | 'offline' | 'unregistered'
  className?: string
}

export type AvatarStyle = CSSProperties & { '--swatch': string }
