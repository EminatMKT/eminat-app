// Answers whether one simple command ({ env, words }) is forbidden by one rule of the
// simple-command kinds (anyToken, programExcept, prefix, prefixWithPattern, pattern).
const positional = (words) => words.slice(1).filter((word) => !word.startsWith('-'))

const hasPrefix = (words, prefix) => {
  const args = positional(words)
  return args.some((_, start) => prefix.every((word, index) => args[start + index] === word))
}

const hasToken = (words, tokens) =>
  words.slice(1).some((word) => tokens.includes(word) || tokens.includes(word.split('=')[0]))

const calls = (command, rule) => rule.programs.includes(command.words[0])

const envHit = (command, rule) => command.env.some((name) => (rule.envNames ?? []).includes(name))

const anyPrefix = (command, rule) => rule.prefixes.some((prefix) => hasPrefix(command.words, prefix))

const textHit = (command, pattern) => new RegExp(pattern, 'i').test(command.words.join(' '))

const sqlHit = (command, rule) => textHit(command, rule.pattern)

// A prefix rule may carry one allowed form (e.g. `supabase link` to the production ref).
const excepted = (command, rule) => Boolean(rule.exceptPattern) && textHit(command, rule.exceptPattern)

const MATCHERS = {
  anyToken: (command, rule) => envHit(command, rule) || (calls(command, rule) && hasToken(command.words, rule.tokens)),
  programExcept: (command, rule) => calls(command, rule) && !rule.readOnly.includes(command.words[1]),
  prefix: (command, rule) => calls(command, rule) && anyPrefix(command, rule) && !excepted(command, rule),
  prefixWithPattern: (command, rule) =>
    calls(command, rule) && anyPrefix(command, rule) && hasToken(command.words, rule.requireTokens) && sqlHit(command, rule),
  pattern: (command, rule) => calls(command, rule) && sqlHit(command, rule),
}

export default function matchCommand(command, rule) {
  return MATCHERS[rule.kind]?.(command, rule) ?? false
}
