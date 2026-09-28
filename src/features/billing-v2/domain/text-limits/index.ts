const TEXT_MAX = {
  title: 120,
  payeeLabel: 120,
  eventTypeLabel: 60,
  noteText: 2000,
} as const

/** The length limit of each free-text column of a billing record, in characters, declared once. */
export default TEXT_MAX

// The same number is enforced three times: the domain schema reads it with `.max()`, the input
// with `maxLength`, and the column with a `char_length()` CHECK. Only the SQL literal is a copy —
// a migration cannot import TypeScript—, and this module's test reads the migrations back and
// compares, so the two cannot drift. A concept and a payee are one line on a calendar chip and a
// reminder card, so they get what a line can carry; an event type is a short tag; a note is the
// one place meant for a paragraph. Raising one is a new migration plus this line.
