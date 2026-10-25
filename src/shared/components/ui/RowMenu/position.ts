type Rect = { top: number; bottom: number; right: number }
type Viewport = { top: number; left: number; width: number; height: number }

export function positionMenu(trigger: Rect, menu: { width: number; height: number }, viewport: Viewport) {
  const margin = 8
  const gap = 4
  const leftEdge = viewport.left + margin
  const topEdge = viewport.top + margin
  const rightEdge = viewport.left + viewport.width - margin
  const bottomEdge = viewport.top + viewport.height - margin
  const below = Math.max(0, bottomEdge - trigger.bottom - gap)
  const above = Math.max(0, trigger.top - gap - topEdge)
  const placement = menu.height > below && above > below ? 'top' : 'bottom'
  const maxHeight = placement === 'top' ? above : below
  const height = Math.min(menu.height, maxHeight)
  const width = Math.min(menu.width, Math.max(0, rightEdge - leftEdge))
  const top = placement === 'top' ? trigger.top - gap - height : trigger.bottom + gap
  return {
    top: Math.max(topEdge, Math.min(top, bottomEdge - height)),
    left: Math.max(leftEdge, Math.min(trigger.right - width, rightEdge - width)),
    maxHeight,
    maxWidth: Math.max(0, rightEdge - leftEdge),
    placement,
  }
}
