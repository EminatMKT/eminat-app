import type { SaveErrors, SaveField, Translate } from '../types'

/** Why the errors hold Save back, in one sentence naming the fields — or null when none does. */
export default function saveReason(errors: SaveErrors, fields: readonly SaveField[], t: Translate): string | null {
  const described = new Set(fields.map((field) => field.name))
  const strays = Object.keys(errors).filter((name) => !described.has(name))
  const all = [...fields, ...strays.map((name) => ({ name, label: name, blank: false }))]
  const unresolved = all.filter((field) => !!errors[field.name])
  const names = (list: SaveField[]) => list.map((field) => field.label).join(', ')
  const missing = unresolved.filter((field) => field.blank)
  const invalid = unresolved.filter((field) => !field.blank)
  if (missing.length && invalid.length) return t('common.saveBlocked.both', { missing: names(missing), invalid: names(invalid) })
  if (missing.length) return t('common.saveBlocked.missing', { fields: names(missing) })
  if (invalid.length) return t('common.saveBlocked.invalid', { fields: names(invalid) })
  return null
}

// The reason is read from the same errors the fields draw under their boxes, so the button and a
// box can never disagree about whether a value is valid. An empty box that the form refuses is
// «missing» —fill it in—, a box holding a refused value is «wrong» —fix it—, and the two go in ONE
// sentence, never two reasons competing beside one button. The order is the order the caller
// draws its fields in; an error of a field it did not describe still counts, named by its key,
// because the one thing this must never do is let an error through without saying so.
