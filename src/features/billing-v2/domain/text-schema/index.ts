import { z } from 'zod'

function hasContent(value: string): boolean {
  return value.trim().length > 0
}

const required = z.string().refine(hasContent)
const optional = z.string().nullable().transform((value) => (value && hasContent(value) ? value : null))

const billingTextSchemas = { required, optional }

/** The two text fields of a billing record: one that must carry something, and one whose
 * blank input becomes null instead of an empty string. */
export default billingTextSchemas

// Blankness is decided by `trim()` and nothing else. That is not a shortcut: the set of
// characters JavaScript trims — tab through carriage return, the space, NBSP, the Unicode
// space family, the line and paragraph separators and the BOM — is the same set the SQL
// nonblank CHECK spells out, so a value the editor accepts is a value the database accepts.
// Neither schema trims what it stores: a note is kept character for character, so indentation
// and blank lines inside a real multiline note survive. Only the optional one rewrites, and
// only to collapse every flavour of blank into the single null the column expects.
