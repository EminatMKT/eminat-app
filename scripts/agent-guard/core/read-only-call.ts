// Whether a programExcept command only reads: its subcommand (`vercel ls`) is one the rule lists
// as read-only, right after the program or after global options and their values (`--cwd . ls`).
import { NONE } from './constants'
import skipOptions from './skip-options'
import type { Rule } from './types'

/** Whether the words run one of the rule's read-only subcommands. */
export default function readOnlyCall(words: string[], { readOnly, valueOptions }: Rule): boolean {
  const [sub] = skipOptions(words.slice(1), valueOptions ?? NONE)

  return readOnly.includes(words[1]) || readOnly.includes(sub)
}
