// Opens what a command runs inside itself: `eval`'s words, a shell's `-c` script, and every
// string literal of interpreter inline code (`node -e`, `python3 -c`), the literals of one
// `[...]` list joined the way subprocess.run(['git', 'push']) spells a command.
import {
  NONE,
  NOTHING,
  RULES,
  SPACE,
} from './constants'
import { LIST, LITERAL, SHELL_SCRIPT_FLAG } from './constants/patterns'
import firstGroup from './first-group'
import type { Command } from './types'

const { evaluators, inlineCodeFlags, shells } = RULES.parsing

const literals = (code: string): string[] => [...code.matchAll(LITERAL)].map(firstGroup)

const joinedList = (match: RegExpMatchArray): string => literals(match[1]).join(SPACE)

const lists = (code: string): string[] => [...code.matchAll(LIST)].map(joinedList)

const inlineSources = (words: string[]): string[] => {
  const flags = inlineCodeFlags[words[0]] ?? NONE
  const at = words.findIndex((word, index) => index > 0 && flags.includes(word))
  const code = at > 0 ? (words[at + 1] ?? NOTHING) : NOTHING

  return [...literals(code), ...lists(code)]
}

const shellScript = (words: string[]): string[] => {
  const flag = words.findIndex((word) => SHELL_SCRIPT_FLAG.test(word))

  return flag > 0 ? [words[flag + 1] ?? NOTHING] : NONE
}

/** The command lines a command carries inside itself, to be read as commands too. */
export default function nested({ words }: Command): string[] {
  if (evaluators.includes(words[0])) return [words.slice(1).join(SPACE)]

  return shells.includes(words[0]) ? shellScript(words) : inlineSources(words)
}
