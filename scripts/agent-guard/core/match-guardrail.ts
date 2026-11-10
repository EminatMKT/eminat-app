// Answers whether a simple command changes, moves or deletes a path a file rule protects:
// a mutating program (rm, mv...), a copy's destination (see copy-targets), an in-place editor
// (sed -i), a git subcommand that rewrites files (git rm, git checkout --), or a `>` redirection.
import { GIT, NONE, RULES } from './constants'
import { IN_PLACE } from './constants/patterns'
import copyTargets from './copy-targets'
import followers from './followers'
import parseGit from './parse-git'
import touchesGuarded from './paths'
import type { Command, Context, Rule } from './types'

const { mutators, inPlaceEditors, gitSubcommands, redirects } = RULES.parsing.fileMutation

const gitMutated = (words: string[]): string[] => {
  const { sub, args } = parseGit(words)

  return gitSubcommands.includes(sub) ? args : NONE
}

const inPlace = (arg: string): boolean => IN_PLACE.test(arg)

const mutated = (words: string[]): string[] => {
  const [program, ...args] = words

  if (program === GIT) return gitMutated(words)

  if (inPlaceEditors.includes(program)) return args.some(inPlace) ? args : NONE

  return mutators.includes(program) ? args : NONE
}

/** Whether a simple command changes, moves or deletes a path the rule protects. */
export default function matchGuardrail(command: Command, rule: Rule, context: Context): boolean {
  const { words } = command
  const targets = [...mutated(words), ...copyTargets(words), ...followers(words, redirects)]

  return targets.some((target) => touchesGuarded(target, context, rule))
}
