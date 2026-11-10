// Checks that an adapter which cannot reach a verdict (a malformed payload, or git unable to run
// for the committed and changed file lists) still blocks, with only the good-practice message
// on stderr: no crash output. A run is `gitless` when git is not on its PATH.
import assert from 'node:assert/strict'
import { EOL } from 'node:os'
import { test } from 'bun:test'
import { BLOCK_EXIT, GUARD_FAILED } from './constants'
import failures from './failures.json' with { type: 'json' }
import spawnAdapter from './spawn'

const NO_GIT = { PATH: '/nonexistent' }
const FAILS_CLOSED = 'fails closed:'

type Failure = (typeof failures)[number]

const label = ({ adapter, stdin }: Failure): string => `${FAILS_CLOSED} ${adapter} ${stdin}`

const check = ({ adapter, stdin, gitless }: Failure): void => {
  const spawned = { adapter, stdin, env: gitless ? NO_GIT : undefined }
  const { status, stderr } = spawnAdapter(spawned)

  assert.equal(status, BLOCK_EXIT, stderr)
  assert.equal(stderr, GUARD_FAILED + EOL)
}

for (const failure of failures) test(label(failure), () => check(failure))
