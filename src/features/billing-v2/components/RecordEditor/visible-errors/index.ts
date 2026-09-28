import type { FieldErrors, RecordForm } from '@/features/billing-v2/components/RecordEditor/types'

/** The messages to draw now: those of the boxes the person left, or all after a save attempt. */
export default function visibleErrors(errors: FieldErrors, left: readonly (keyof RecordForm)[], attempted: boolean): FieldErrors {
  if (attempted) return errors
  const shown: FieldErrors = {}
  for (const name of left) {
    const key = errors[name]
    if (key) shown[name] = key
  }
  return shown
}

// Validation runs on every change, but showing is a separate decision: a box that says "invalid"
// after the first keystroke is scolding somebody who has not finished typing. A message appears
// once the person leaves its box or presses Save, and from then on follows every change — it is
// recomputed from the current form, so a box that becomes valid loses its message at once.
