// Turns a shell line into the simple commands it would run. Nested shells, `eval`,
// interpreter inline code and `$(...)` substitutions are opened and added too; an alias
// value is added marked `alias`, since the arguments it will get are not on this line.
import { ALIAS, NONE, PLACEHOLDER } from './constants'
import { ALIAS_VALUE, SUBSTITUTION } from './constants/patterns'
import firstGroup from './first-group'
import groupList from './group-list'
import nested from './nested'
import simple from './simple'
import split from './split'
import tokenize from './tokenize'
import type { Command } from './types'

const substitutions = (line: string): string[] =>
  [...line.matchAll(SUBSTITUTION)].map(firstGroup)

const ownCommands = (line: string): Command[] => {
  const flat = line.replace(SUBSTITUTION, PLACEHOLDER)
  const groups = split(tokenize(flat))

  return groups.map(simple)
}

const aliasValue = (word: string): string[] => groupList(ALIAS_VALUE, word)

const aliasValues = ({ words }: Command): string[] =>
  words[0] === ALIAS ? words.slice(1).flatMap(aliasValue) : NONE

const asAlias = (command: Command): Command => ({ ...command, alias: true })

/** Every simple command a shell line would run, nested and aliased ones included. */
export default function segments(line: string): Command[] {
  const own = ownCommands(line)
  const opened = [...substitutions(line), ...own.flatMap(nested)]
  const aliased = own.flatMap(aliasValues).flatMap(segments)
  const result = [...own, ...opened.flatMap(segments), ...aliased.map(asAlias)]

  return result
}
