// Reads a `git ...` command the way git does: global options first (`-C dir`, `-c k=v`,
// `-ck=v`, `--git-dir dir`), then the subcommand and its own arguments.
import { CONFIG_FLAGS, RULES } from './constants'
import { ATTACHED_CONFIG, OPTION } from './constants/patterns'
import followers from './followers'
import groupList from './group-list'
import type { GitCommand } from './types'

const { gitValueOptions } = RULES.parsing
const FIRST = 1

const globalEnd = (words: string[], index: number): number => {
  const done = index >= words.length || !OPTION.test(words[index])

  if (done) return index

  const width = gitValueOptions.includes(words[index]) ? 2 : 1

  return globalEnd(words, index + width)
}

const attachedConfig = (word: string): string[] => groupList(ATTACHED_CONFIG, word)

/** The global `-c` settings, the subcommand and its arguments of one git command. */
export default function parseGit(words: string[]): GitCommand {
  const end = globalEnd(words, FIRST)
  const globals = words.slice(FIRST, end)
  const configs = [...followers(globals, CONFIG_FLAGS), ...globals.flatMap(attachedConfig)]
  const git = { configs, sub: words[end], args: words.slice(end + 1) }

  return git
}
