// The first rule a shell line breaks. A linePattern rule reads the whole line, pipes included
// (`printenv | grep TOKEN`); an alias calling a guarded program is refused even when its value
// alone is harmless, because the arguments it will get later are not on this line.
import calls from './calls'
import { LINE_PATTERN, RULES } from './constants'
import forbids from './forbids'
import segments from './segments'
import textHit from './text-hit'
import type { Command, Context, Rule } from './types'

const lineHit = (rule: Rule, line: string): boolean =>
  rule.kind === LINE_PATTERN && textHit(rule.pattern, line)

const aliasHit = (rule: Rule, command: Command): boolean =>
  Boolean(command.alias) && calls(command, rule)

const runs = ({ words, env }: Command): boolean => Boolean(words.length || env.length)

/** The first rule the shell line breaks, or undefined when it breaks none. */
export default function commandRule(line: string, context: Context): Rule | undefined {
  const commands = segments(line).filter(runs)
  const breaks = (rule: Rule): boolean =>
    lineHit(rule, line) || commands.some((command) => forbids(rule, command, context))
  const aliased = (rule: Rule): boolean => commands.some((command) => aliasHit(rule, command))

  return RULES.rules.find(breaks) ?? RULES.rules.find(aliased)
}
