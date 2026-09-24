const SEPARATOR = ' · '

/** The present pieces of a line, in order, with one separator between each two. */
export default function joinLine(parts: readonly (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(SEPARATOR)
}

// How every line of the billing screen is put together: the calendar chip, its spoken label, the
// reminder row and the month note. Written once so they all use the same separator, and so an
// absent piece —no payee, no time— drops out instead of leaving " ·  · " behind.
