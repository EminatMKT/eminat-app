// Checks of what a branch changes when the adapter cannot tell: outside a checkout, and in a
// checkout without `origin/main`, the list is empty, so a docsCurrent rule never blocks there.
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'bun:test'
import { NONE } from '../core/constants'
import ask from './ask'
import changed from './changed'

const TEMP_PREFIX = 'agent-guard-changed-'
const INIT = ['init', '-q']
const NO_CHECKOUT = 'outside a checkout the branch changes nothing'
const NO_BASE = 'without origin/main the branch changes nothing'

const scratch = (): string => mkdtempSync(join(tmpdir(), TEMP_PREFIX))

const noBase = (): void => {
  const root = scratch()

  ask(INIT, root)
  assert.deepEqual(changed(root), NONE)
}

test(NO_CHECKOUT, () => assert.deepEqual(changed(scratch()), NONE))
test(NO_BASE, noBase)
