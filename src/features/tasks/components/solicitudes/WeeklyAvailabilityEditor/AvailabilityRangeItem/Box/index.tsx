import type { BoxProps } from './types'

export default function Box({ as: Tag = 'div', className, children }: BoxProps) {
  return <Tag className={className}>{children}</Tag>
}

// Box renders one tag with one className: a layout grouping with no markup of its own to
// duplicate, so AvailabilityRangeItem can compose its list-item and field-group wrappers from it.
