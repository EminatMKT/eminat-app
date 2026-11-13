import type { Props as AvatarProps } from '@/shared/components/Avatar/types'

export type Props = Omit<AvatarProps, 'className'> & {
  name: string
  subtitle?: string
  className?: string
}
