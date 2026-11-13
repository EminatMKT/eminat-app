// Checks of the drift test behind `--check`: a root without the generated files reports each one
// missing, and the same root shows no drift once `--write` has written them.
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'bun:test'
import { NONE } from '../core'
import { DRIFT } from './constants'
import drift from './drift'
import targets from './targets'
import writeAll from './write'

const TEMP_PREFIX = 'agent-guard-'
const MISSING_IS_DRIFT = 'a root without the generated files reports every one missing'
const WRITTEN_IS_CLEAN = 'after writing them the same root shows no drift'

const emptyRoot = (): string => mkdtempSync(join(tmpdir(), TEMP_PREFIX))

const missingIsDrift = (): void => {
  const reports = drift(emptyRoot())

  assert.equal(reports.length, targets().length)

  for (const report of reports) assert.ok(report.includes(DRIFT.missing), report)
}

const writtenIsClean = (): void => {
  const root = emptyRoot()

  writeAll(root)
  assert.deepEqual(drift(root), NONE)
}

test(MISSING_IS_DRIFT, missingIsDrift)
test(WRITTEN_IS_CLEAN, writtenIsClean)
