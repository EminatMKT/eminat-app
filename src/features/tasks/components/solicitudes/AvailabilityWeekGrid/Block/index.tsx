'use client'
import type { BlockProps } from './types'
import blockGeometry from './geometry'
import type { BlockGeometry } from './geometry/types'
import BlockContent from './BlockContent'
import EdgeHandles from './EdgeHandles'
import s from './index.module.css'

const CLASS_SEPARATOR = ' '
const EMPTY_CLASS = ''

const isPresent = (value: string): boolean => value !== EMPTY_CLASS

function blockClassName(geometry: BlockGeometry, props: Pick<BlockProps, 'readOnly'>): string {
  const compactClass = geometry.compact ? s.compact : EMPTY_CLASS
  const readOnlyClass = props.readOnly ? s.readOnly : EMPTY_CLASS
  const blockClasses = [s.block, compactClass, readOnlyClass]

  return blockClasses.filter(isPresent).join(CLASS_SEPARATOR)
}

// centinela-exime: bloques-similares@7 — searched src/shared/components/ui (28) and
// src/features for a dynamically-positioned time-block/card primitive with resize
// affordances; none exists. Hover-only note rejected (ihc.md: not hover-only, touch).

/** One availability range drawn on the week grid: its position and size come from
 *  `blockGeometry`, its labelled face from `BlockContent`, and -when editable- `EdgeHandles`
 *  sit beside that `Pressable` surface rather than nested inside it. */
export default function Block({ range, pxPerMin, ...rest }: BlockProps) {
  const geometry = blockGeometry(range, pxPerMin)

  return (
    <div className={blockClassName(geometry, rest)} style={geometry.style}>
      <BlockContent range={range} {...rest} />
      {rest.readOnly ? null : <EdgeHandles {...rest} />}
    </div>
  )
}

// Block composes geometry, label and the resize handles into one range's visible cell - it
// never computes pixel positions or ARIA text itself, only wires the pieces that do.
