import {
  FIRST_INDEX,
  INITIALS_SIZE,
  LAST_OFFSET,
  NAME_SEPARATOR,
} from './constants'

function isWord(value: string): value is string {
  return value.length > 0
}

/** Two-letter avatar fallback: first letter of the first word, first letter of the last word,
 *  uppercased. A single-word name has no second word, so first and last are the same one — its
 *  one letter doubled. */
export default function memberInitials(name: string): string {
  const words = name.split(NAME_SEPARATOR).filter(isWord)
  const first = words[FIRST_INDEX] ?? ''
  const last = words[words.length - LAST_OFFSET] ?? ''
  const letters = `${first[FIRST_INDEX] ?? ''}${last[FIRST_INDEX] ?? ''}`

  return letters.toUpperCase().slice(FIRST_INDEX, INITIALS_SIZE)
}

// memberInitials renders the two-letter avatar fallback MemberAvailabilityCard's PersonSummary
// shows when a member has no photo.
