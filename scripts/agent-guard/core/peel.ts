// Peels the leading variable assignments, shell keywords and runners (pnpm, npx, sudo...)
// off a simple command, so what is left starts with the program that really runs. Each head
// is named without its path first, and a runner's options are skipped with their values.
import { NONE, RULES } from './constants'
import { ASSIGNMENT } from './constants/patterns'
import programName from './program-name'
import skipOptions from './skip-options'
import startsAt from './starts-at'
import type { Peeled } from './types'

const { runners, runnerValueOptions, wrappers } = RULES.parsing
const START = 0

const peelRunner = (words: string[]): string[] => {
  const runner = runners.find((prefix) => startsAt(words, prefix, START))

  if (!runner) return words

  const valued = runnerValueOptions[words[0]] ?? NONE

  return skipOptions(words.slice(runner.length), valued)
}

const named = (words: string[]): string[] =>
  words.length ? [programName(words[0]), ...words.slice(1)] : words

/** A simple command with its leading assignments, keywords and runners taken off. */
export default function peel(words: string[], env: string[]): Peeled {
  const assignment = words.length ? ASSIGNMENT.exec(words[0]) : null

  if (assignment) return peel(words.slice(1), [...env, assignment[1]])

  const program = named(words)
  const peeled = wrappers.includes(program[0]) ? program.slice(1) : peelRunner(program)

  return peeled === program ? { env, words: program } : peel(peeled, env)
}
