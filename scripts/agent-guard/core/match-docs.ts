// Whether a git push sends a branch that changes an area its doc (AGENTS.md) describes while
// the doc itself stays unchanged. The adapter lists what the branch changes against its base
// in `context.changed`; a rehearsal (`--dry-run`) sends nothing and is let through.
import calls from './calls'
import { PUSH } from './constants'
import flagName from './flag-name'
import globHit from './glob-hit'
import parseGit from './parse-git'
import type { Command, Context, Rule } from './types'

const rehearsal = (args: string[], { exceptFlags }: Rule): boolean =>
  args.some((arg) => exceptFlags.includes(flagName(arg)))

const stale = ({ changed }: Context, { areas, doc }: Rule): boolean => {
  const documented = (file: string): boolean => areas.some((area) => globHit(area, file))

  return changed.some(documented) && !changed.includes(doc)
}

/** Whether a command pushes a branch that changes a documented area but not its doc. */
export default function matchDocs(command: Command, rule: Rule, context: Context): boolean {
  if (!calls(command, rule)) return false

  const { sub, args } = parseGit(command.words)

  return sub === PUSH && !rehearsal(args, rule) && stale(context, rule)
}
