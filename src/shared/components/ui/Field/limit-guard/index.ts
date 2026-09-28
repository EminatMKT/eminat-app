import overflowOf from '../overflow'
import INSERTION from '../insertion'
import type { LimitArm, LimitHandlers } from '../types'

/** The text of the box and how much of it is selected, read off the element the event hit. */
function boxOf(target: object) {
  const value = 'value' in target && typeof target.value === 'string' ? target.value : ''
  const start = 'selectionStart' in target && typeof target.selectionStart === 'number' ? target.selectionStart : value.length
  const end = 'selectionEnd' in target && typeof target.selectionEnd === 'number' ? target.selectionEnd : start
  const box = { length: value.length, selected: end - start }
  return box
}

/** The handlers that tell `arm` how many characters each insertion into the box will lose. */
export default function limitGuard(max: number, arm: LimitArm) {
  const measure = (target: object, inserted: string, replacesSelection: boolean) => {
    const { length, selected } = boxOf(target)
    const replaced = replacesSelection ? selected : 0
    arm(overflowOf({ length, selected: replaced, inserted: inserted.length, max }), inserted.length)
  }
  const handlers: LimitHandlers = {
    onPaste: (event) => measure(event.currentTarget, event.clipboardData.getData(INSERTION.plainText), INSERTION.replacesSelection),
    onDrop: (event) => measure(event.currentTarget, event.dataTransfer.getData(INSERTION.plainText), INSERTION.landsAtPointer),
    onBeforeInput: (event) => measure(event.currentTarget, event.data, INSERTION.replacesSelection),
  }
  return handlers
}

// These run BEFORE the text lands, while the box still holds what it had: that is the only
// moment the loss can be measured, because afterwards the browser has already cut it.
