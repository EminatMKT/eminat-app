// Table-driven check of the guard core: every rule in rules.json has at least one
// blocking case here, and every case runs against decide() alone (no CLI, no I/O).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import cases from './cases.json' with { type: 'json' }
import rules from '../rules.json' with { type: 'json' }
import decide from './decide.mjs'

const ROOT = '/repo'
const context = (branch) => ({ cwd: ROOT, root: ROOT, branch: branch ?? 'feat/x', committed: cases.committed })

const label = (row) => `${row.expect} ${JSON.stringify(row.command ?? row.path)}`

const check = (row, request) => {
  const verdict = decide(request, context(row.branch))
  assert.equal(verdict.decision, row.expect, label(row))
  if (row.rule) assert.equal(verdict.rule, row.rule, label(row))
}

for (const row of cases.commands) {
  test(label(row), () => check(row, { command: row.command }))
}

for (const row of cases.paths) {
  test(label(row), () => check(row, { paths: [row.path.replace(/^(?!\/)/, `${ROOT}/`)] }))
}

test('every rule has a blocking case', () => {
  const covered = new Set([...cases.commands, ...cases.paths].map((row) => row.rule))
  for (const rule of rules.rules) assert.ok(covered.has(rule.id), rule.id)
})

test('every block message opens with the good-practice framing and names no way around it', () => {
  for (const row of cases.commands.filter((item) => item.expect === 'block')) {
    const { message } = decide({ command: row.command }, context(row.branch))
    assert.ok(message.startsWith(rules.framing.es), label(row))
    for (const hint of cases.neverInMessages) assert.ok(!message.includes(hint), hint)
  }
})
