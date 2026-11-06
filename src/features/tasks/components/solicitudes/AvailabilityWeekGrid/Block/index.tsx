'use client'
import { useT } from '@/shared/i18n'
import type { BlockProps, BlockResizeEdge } from './types'
import blockGeometry from './geometry'
import accessibleLabel from './accessible-label'
import ResizeHandle from './ResizeHandle'
import { Pressable } from '@/shared/components/ui'
import s from './index.module.css'

const TOP_EDGE: BlockResizeEdge = 'top'
const BOTTOM_EDGE: BlockResizeEdge = 'bottom'
const CLASS_SEPARATOR = ' '
const EMPTY_CLASS = ''

const isPresent = (value: string): boolean => value !== EMPTY_CLASS

// centinela-exime: bloques-similares@7 — searched src/shared/components/ui (28) and
// src/features for a dynamically-positioned time-block/card primitive with resize
// affordances; none exists. Hover-only note rejected (ihc.md: not hover-only, touch).

/** One availability range drawn on the week grid: its position and size come from
 *  `blockGeometry`, its accessible text from `accessibleLabel`, and -when editable- a pair of
 *  resize handles sit beside its `Pressable` surface rather than nested inside it. */
export default function Block(props: BlockProps) {
  const {
    range, readOnly, pxPerMin, onActivate,
    onResizeHandlePointerDown, onResizeHandleLifecycle,
  } = props
  const { t } = useT()
  const { style, compact } = blockGeometry(range, pxPerMin)
  const label = accessibleLabel(range, readOnly, t)
  const compactClass = compact ? s.compact : EMPTY_CLASS
  const readOnlyClass = readOnly ? s.readOnly : EMPTY_CLASS
  const blockClasses = [s.block, compactClass, readOnlyClass]
  const blockClassName = blockClasses.filter(isPresent).join(CLASS_SEPARATOR)

  return (
    <div className={blockClassName} style={style}>
      <Pressable accessibleLabel={label} onClick={onActivate} className={s.content}>
        <span className={s.time}>{range.startsAt}–{range.endsAt}</span>
        {range.note ? <span className={s.note}>{range.note}</span> : null}
      </Pressable>
      {!readOnly ? (
        <>
          <ResizeHandle
            edge={TOP_EDGE}
            onPointerDown={onResizeHandlePointerDown}
            lifecycle={onResizeHandleLifecycle}
          />
          <ResizeHandle
            edge={BOTTOM_EDGE}
            onPointerDown={onResizeHandlePointerDown}
            lifecycle={onResizeHandleLifecycle}
          />
        </>
      ) : null}
    </div>
  )
}

// Block composes geometry, label and the resize handles into one range's visible cell - it
// never computes pixel positions or ARIA text itself, only wires the pieces that do.
