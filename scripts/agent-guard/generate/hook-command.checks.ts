// The generated hook commands, run as each CLI runs them: with the repo-local bun they answer
// what the core decides, and without it they fail closed with the good-practice framing.
import assert from 'node:assert/strict'
import { test } from 'bun:test'
import { BLOCK_EXIT, QUOTE } from '../adapters/constants'
import cases from '../core/cases.json' with { type: 'json' }
import { SOURCE } from './constants'
import samples from './hook-samples.json' with { type: 'json' }
import runSample from './run-sample'
import type { HookSample } from './types'

const UNQUOTED = 'the guard-unavailable text fits inside a single-quoted shell word'

const framed = (stderr: string, { unavailable }: HookSample): void => {
  assert.ok(stderr.startsWith(SOURCE.framing.es), stderr)
  assert.equal(stderr.includes(SOURCE.unavailable.es), unavailable, stderr)

  for (const hint of cases.neverInMessages) assert.ok(!stderr.includes(hint), hint)
}

const check = (sample: HookSample): void => {
  const { error, status, stderr } = runSample(sample)

  assert.equal(error, undefined, String(error))
  assert.equal(status, sample.exit, stderr)

  if (sample.exit === BLOCK_EXIT) framed(stderr, sample)
}

const unquoted = (): void => {
  const texts = [...Object.values(SOURCE.framing), ...Object.values(SOURCE.unavailable)]

  for (const text of texts) assert.ok(!text.includes(QUOTE), text)
}

for (const sample of samples) test(JSON.stringify(sample), () => check(sample))

test(UNQUOTED, unquoted)
