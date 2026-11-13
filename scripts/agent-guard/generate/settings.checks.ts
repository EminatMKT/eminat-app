// Checks of the generated hook configs: every generated file renders the same twice, Claude's
// permissions are Bash/Edit/Read rules only, and each CLI hooks its shell and file tools.
import assert from 'node:assert/strict'
import { test } from 'bun:test'
import { GUARDRAIL_FILES, NONE } from '../core'
import codexHooks from './codex-hooks'
import { CLAUDE_MATCHERS, CODEX_MATCHERS, SOURCE } from './constants'
import settings from './settings'
import targets from './targets'
import type { GuardRule, HookGroup } from './types'

const PERMISSION = /^(Bash|Edit|Read)\(.+\)$/
const DETERMINISTIC = 'every generated file renders the same twice'
const CLAUDE_SHAPE = 'settings.json holds only Bash/Edit/Read rules and hooks Bash and file tools'
const GUARDED = 'settings.json denies Edit on every guarded path and Read on every secret glob'
const CODEX_SHAPE = 'hooks.json hooks Bash and apply_patch'

const matcherOf = ({ matcher }: HookGroup): string => matcher

const deterministic = (): void => {
  for (const { path, render } of targets()) assert.equal(render(), render(), path)
}

const claudeShape = (): void => {
  const { permissions, hooks } = settings()
  const entries = [...permissions.deny, ...permissions.ask]

  assert.deepEqual(hooks.PreToolUse.map(matcherOf), CLAUDE_MATCHERS)

  for (const entry of entries) assert.match(entry, PERMISSION)
}

const protectedBy = ({ kind, paths, readPaths }: GuardRule): string[] =>
  [...(kind === GUARDRAIL_FILES ? paths : NONE), ...(readPaths ?? NONE)]

const guarded = (): void => {
  const denied = settings().permissions.deny.join()

  for (const path of SOURCE.rules.flatMap(protectedBy)) assert.ok(denied.includes(path), path)
}

const codexShape = (): void => {
  const matchers = codexHooks().hooks.PreToolUse.map(matcherOf)

  assert.deepEqual(matchers, CODEX_MATCHERS)
}

test(DETERMINISTIC, deterministic)
test(CLAUDE_SHAPE, claudeShape)
test(GUARDED, guarded)
test(CODEX_SHAPE, codexShape)
