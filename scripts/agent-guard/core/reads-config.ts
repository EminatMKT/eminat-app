// Whether a `git config` call only reads (`--get`, `--get-regexp`, `--list`, or the `get` and
// `list` subcommands as its first operand), so the keys it names are not being set.
import { CONFIG } from './constants'
import { OPTION } from './constants/patterns'
import operands from './operands'
import type { GitCommand, Rule } from './types'

const isOption = (word: string): boolean => OPTION.test(word)

/** Whether the git command is a `git config` read. */
export default function readsConfig({ sub, args }: GitCommand, { configReads }: Rule): boolean {
  const [first] = operands(args)
  const words = [...args.filter(isOption), first]

  return sub === CONFIG && words.some((word) => configReads.includes(word))
}
