/** The pointer-capture-capable element every gesture handler reaches through its event's
 *  `currentTarget` — the minimal shape this module needs, satisfied by any real DOM element. */
export type GesturePointerCaptureTarget = {
  setPointerCapture: (pointerId: number) => void
  releasePointerCapture: (pointerId: number) => void
}

/** The minimal pointer event shape every gesture handler reads. A real React `PointerEvent`
 *  satisfies this structurally, so these handlers wire directly onto JSX pointer props. */
export type GesturePointerEvent = {
  readonly pointerId: number
  readonly clientY: number
  readonly currentTarget: GesturePointerCaptureTarget
}

/** The day column's own geometry a pointer position is read against: its top edge and the
 *  pixel density it draws at. Shared by every gesture that turns a `clientY` into a minute. */
export type GestureColumnGeometry = {
  columnTop: number
  pxPerMin: number
}
