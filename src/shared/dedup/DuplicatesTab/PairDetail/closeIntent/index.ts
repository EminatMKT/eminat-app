import { CLOSE_CONFIRM, CLOSE_IGNORED, CLOSE_NOW } from '../constants'
import type { CloseIntent } from '../types'

/** What a close request (✕, Escape, backdrop, Cancel) does: nothing mid-decision, a question when
 *  picks or unchecked values would be lost, otherwise close. */
export default function closeIntent(ocupado: boolean, dirty: boolean): CloseIntent {
  if (ocupado) return CLOSE_IGNORED
  const intent: CloseIntent = dirty ? CLOSE_CONFIRM : CLOSE_NOW
  return intent
}

// Pure decision table for `PairDetail`'s close request, kept out of the component so the three
// outcomes — ignore, confirm, close now — have one tested place instead of living in a branch.
