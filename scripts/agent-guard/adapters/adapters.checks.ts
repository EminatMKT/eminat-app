// End-to-end check of each CLI adapter: the real script is spawned with a sample hook payload
// on stdin, the way the CLI runs it, and only its exit code and stderr are read.
import assert from 'node:assert/strict'
import { test } from 'bun:test'
import { NOTHING, RULES } from '../core/constants'
import { HOOK_TOKENS } from '../generate/constants'
import { BLOCK_EXIT } from './constants'
import samples from './samples.json' with { type: 'json' }
import spawnAdapter from './spawn'

const LABEL_WIDTH = 60

type Sample = (typeof samples)[number]

const label = ({ adapter, input, exit }: Sample): string =>
  `${adapter} ${JSON.stringify(input).slice(0, LABEL_WIDTH)} -> exit ${exit}`

const run = ({ adapter, input }: Sample) => {
  const body = { cwd: HOOK_TOKENS.root, tool_input: input }
  const spawned = { adapter, stdin: JSON.stringify(body) }

  return spawnAdapter(spawned)
}

// A spawn that failed (e.g. EPERM) reports no real exit code: never read it as a verdict.
const check = (sample: Sample): void => {
  const { error, status, stderr } = run(sample)

  assert.equal(error, undefined, String(error))
  assert.equal(status, sample.exit, stderr)

  if (sample.exit === BLOCK_EXIT) assert.ok(stderr.startsWith(RULES.framing.es), stderr)
  else assert.equal(stderr, NOTHING)
}

for (const sample of samples) test(label(sample), () => check(sample))
