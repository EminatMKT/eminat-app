import type { Command, Rule } from './types'

/** Whether a command runs one of the programs the rule guards. */
export default function calls({ words }: Command, { programs }: Rule): boolean {
  return programs.includes(words[0])
}
