// Checks of the generated Codex rules file: every rule with a prefix shows up once behind each
// package runner, and it carries its block message as justification.
import assert from 'node:assert/strict'
import { test } from 'bun:test'
import { message } from '../core'
import { SOURCE } from './constants'
import { RULE_OPEN } from './constants/execpolicy'
import execpolicy from './execpolicy'
import patterns from './patterns'

const JUSTIFIED = 'every rule with a prefix carries its block message as justification'
const EVERY_RUNNER = 'every prefix is written once per package runner'

const justified = (): void => {
  const text = execpolicy()
  const covered = SOURCE.rules.filter((rule) => patterns(rule).length)

  for (const rule of covered) assert.ok(text.includes(JSON.stringify(message(rule))), rule.id)
}

const everyRunner = (): void => {
  const written = execpolicy().split(RULE_OPEN).length - 1
  const prefixes = SOURCE.rules.flatMap(patterns).length

  assert.equal(written, prefixes * SOURCE.parsing.codexRunners.length)
}

test(JUSTIFIED, justified)
test(EVERY_RUNNER, everyRunner)
