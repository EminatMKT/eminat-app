// Answers whether a simple command changes, moves or deletes one of the paths a file rule
// protects: a mutating program (rm, mv, chmod...), an in-place editor (sed -i), a git
// subcommand that rewrites files (git rm, git checkout --), or a `>` redirection onto it.
import rules from '../rules.json' with { type: 'json' }
import parseGit from './git.mjs'
import touchesGuarded from './paths.mjs'

const { mutators, inPlaceEditors, gitSubcommands, redirects } = rules.parsing.fileMutation
const GIT = 'git'
const IN_PLACE = /^(-i|--in-place)/

const redirected = (words) =>
  words.flatMap((word, index) => (redirects.includes(words[index - 1]) ? [word] : []))

const mutated = (words) => {
  const [program, ...args] = words
  if (program === GIT) return gitSubcommands.includes(parseGit(words).sub) ? parseGit(words).args : []
  if (inPlaceEditors.includes(program)) return args.some((arg) => IN_PLACE.test(arg)) ? args : []
  return mutators.includes(program) ? args : []
}

export default function matchGuardrail(command, rule, context) {
  const targets = [...mutated(command.words), ...redirected(command.words)]
  return targets.some((target) => touchesGuarded(target, context, rule))
}
