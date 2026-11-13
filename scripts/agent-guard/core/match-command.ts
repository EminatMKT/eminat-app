// Answers whether one simple command is forbidden by one rule of the simple-command kinds
// (anyToken, programExcept, prefix, prefixWithPattern, pattern).
import calls from './calls'
import { SPACE } from './constants'
import envHit from './env-hit'
import flagName from './flag-name'
import operands from './operands'
import readOnlyCall from './read-only-call'
import startsAt from './starts-at'
import textHit from './text-hit'
import type { Command, Matcher, Rule } from './types'

const hasPrefix = (words: string[], prefix: string[]): boolean => {
  const args = operands(words.slice(1))

  return args.some((_, start) => startsAt(args, prefix, start))
}

const hasToken = (words: string[], tokens: string[]): boolean =>
  words.slice(1).some((word) => tokens.includes(word) || tokens.includes(flagName(word)))

const anyPrefix = ({ words }: Command, { prefixes }: Rule): boolean =>
  prefixes.some((prefix) => hasPrefix(words, prefix))

const commandHit = ({ words }: Command, pattern: string): boolean =>
  textHit(pattern, words.join(SPACE))

// A prefix rule may carry one allowed form (e.g. `supabase link` to the production ref).
const excepted = (command: Command, { exceptPattern }: Rule): boolean =>
  Boolean(exceptPattern) && commandHit(command, exceptPattern)

const anyToken: Matcher = (command, rule) =>
  envHit(command, rule) || (calls(command, rule) && hasToken(command.words, rule.tokens))

const programExcept: Matcher = (command, rule) =>
  calls(command, rule) && !readOnlyCall(command.words, rule)

const prefix: Matcher = (command, rule) =>
  calls(command, rule) && anyPrefix(command, rule) && !excepted(command, rule)

const prefixWithPattern: Matcher = (command, rule) =>
  calls(command, rule) && anyPrefix(command, rule) &&
  hasToken(command.words, rule.requireTokens) && commandHit(command, rule.pattern)

const pattern: Matcher = (command, rule) =>
  calls(command, rule) && commandHit(command, rule.pattern)

const MATCHERS: Record<string, Matcher> = {
  anyToken,
  programExcept,
  prefix,
  prefixWithPattern,
  pattern,
}

/** Whether one simple command breaks one rule of the simple-command kinds. */
export default function matchCommand(command: Command, rule: Rule): boolean {
  return MATCHERS[rule.kind]?.(command, rule) ?? false
}
