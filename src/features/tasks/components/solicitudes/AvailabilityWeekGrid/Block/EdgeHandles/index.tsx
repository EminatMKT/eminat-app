import {
  BOTTOM_EDGE,
  TOP_EDGE,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry'
import ResizeHandle from '../ResizeHandle'
import type { BlockProps } from '../types'

type Props = Pick<BlockProps, 'onResizeHandlePointerDown' | 'onResizeHandleLifecycle'>

/** An editable block's two resize handles, top then bottom, sharing one pointer wiring. */
export default function EdgeHandles(props: Props) {
  const onPointerDown = props.onResizeHandlePointerDown
  const lifecycle = props.onResizeHandleLifecycle

  return <>
    <ResizeHandle edge={TOP_EDGE} onPointerDown={onPointerDown} lifecycle={lifecycle} />
    <ResizeHandle edge={BOTTOM_EDGE} onPointerDown={onPointerDown} lifecycle={lifecycle} />
  </>
}

// EdgeHandles is the drag affordance pair Block mounts only while the block is editable.
