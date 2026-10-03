import type { ComboState } from '../types'

const NONE = -1

/** Closed with nothing highlighted; spread with `open: true` it is the freshly opened state. */
const CLOSED: ComboState = { open: false, active: NONE }

export default CLOSED

// The resting state of every combobox. The key handler and the hook both start from it, so the
// "nothing highlighted" index is written once.
