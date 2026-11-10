// One simple command as the matchers read it: its variable assignments (leading or
// `export`ed) apart, its program named without path or `@version`, and xargs marked.
import { EXPORT, NONE, XARGS } from './constants'
import { ASSIGNMENT } from './constants/patterns'
import groupList from './group-list'
import peel from './peel'
import programName from './program-name'
import type { Command } from './types'

const assignedName = (word: string): string[] => groupList(ASSIGNMENT, word)

const exported = (words: string[]): string[] =>
  words[0] === EXPORT ? words.slice(1).flatMap(assignedName) : NONE

/** The simple command a group of words runs, with its runners peeled off. */
export default function simple(words: string[]): Command {
  const peeled = peel(words, NONE)
  const runners = words.slice(0, words.length - peeled.words.length).map(programName)
  const env = [...peeled.env, ...exported(peeled.words)]
  const command = { env, words: peeled.words, xargs: runners.includes(XARGS) }

  return command
}
