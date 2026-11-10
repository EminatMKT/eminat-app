// Table-driven check of the guard core: every rule in rules.json has at least one blocking
// case, and every case runs against decide() alone (no CLI, no I/O).
import assert from 'node:assert/strict'
import { test } from 'bun:test'
import cases from './cases.json' with { type: 'json' }
import { BLOCK, NONE, RULES } from './constants'
import decide from './decide'
import type { CaseRow, Context, GuardRequest } from './types'

const ROOT = '/repo'
const ROOT_DIR = `${ROOT}/`
const DEFAULT_BRANCH = 'feat/x'
const NOT_ABSOLUTE = /^(?!\/)/
const EVERY_RULE = 'every rule has a blocking case'
const FRAMED = 'every block message opens with the framing and names no way around it'
const rows: CaseRow[] = [...cases.commands, ...cases.paths]
const place = { cwd: ROOT, root: ROOT, committed: cases.committed }

const context = ({ branch, changed }: CaseRow): Context =>
  ({ ...place, branch: branch ?? DEFAULT_BRANCH, changed: changed ?? NONE })

const label = ({ expect, command, path }: CaseRow): string =>
  `${expect} ${JSON.stringify(command ?? path)}`

const requestOf = ({ command, path }: CaseRow): GuardRequest =>
  ({ command, paths: path ? [path.replace(NOT_ABSOLUTE, ROOT_DIR)] : undefined })

const check = (row: CaseRow): void => {
  const { expect, rule } = row
  const verdict = decide(requestOf(row), context(row))

  assert.equal(verdict.decision, expect, label(row))

  if (rule) assert.equal(verdict.rule, rule, label(row))
}

const coverage = (): void => {
  const covered = new Set(rows.map((row) => row.rule))

  for (const { id } of RULES.rules) assert.ok(covered.has(id), id)
}

const assertFramed = (row: CaseRow): void => {
  const { message } = decide(requestOf(row), context(row))

  assert.ok(message.startsWith(RULES.framing.es), label(row))

  for (const hint of cases.neverInMessages) assert.ok(!message.includes(hint), hint)
}

const framed = (): void =>
  cases.commands.filter((row) => row.expect === BLOCK).forEach(assertFramed)

for (const row of rows) test(label(row), () => check(row))

test(EVERY_RULE, coverage)
test(FRAMED, framed)
