// The files the generators own, each with its path from the repo root and its renderer: the two
// JSON configs as two-space JSON with a final newline, the rules file as Starlark text.
import { NEWLINE } from '../core'
import {
  CODEX_HOOKS_PATH,
  EXECPOLICY_PATH,
  JSON_INDENT,
  NO_REPLACER,
  SETTINGS_PATH,
} from './constants'
import codexHooks from './codex-hooks'
import execpolicy from './execpolicy'
import settings from './settings'
import type { Target } from './types'

const asJson = (build: () => object) => (): string =>
  JSON.stringify(build(), NO_REPLACER, JSON_INDENT) + NEWLINE

/** Every generated file, in a fixed order. */
export default function targets(): Target[] {
  const files = [
    { path: SETTINGS_PATH, render: asJson(settings) },
    { path: CODEX_HOOKS_PATH, render: asJson(codexHooks) },
    { path: EXECPOLICY_PATH, render: execpolicy },
  ]

  return files
}
