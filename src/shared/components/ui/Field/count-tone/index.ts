/** From this share of the limit on, the count is drawn: early enough to plan the last words. */
const SHOW_FROM = 0.8

/** Whether a box's character count is drawn, and in which tone. `null`: nothing is drawn. */
export default function countTone(length: number, max: number): 'near' | 'full' | null {
  if (max <= 0 || length < max * SHOW_FROM) return null
  return length >= max ? 'full' : 'near'
}

// A count drawn from the first keystroke is noise on a field that almost never fills up; one
// that appears near the end is the warning. At the limit it changes tone, because that is where
// typing stops working.
