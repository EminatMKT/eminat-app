// Values the guard core compares against or joins with, and the rules file, typed.
import json from '../rules.json' with { type: 'json' }
import type { Language, RulesFile, Verdict } from './types'

export const RULES: RulesFile = json
export const NOTHING = ''
export const SPACE = ' '
export const NEWLINE = '\n'
export const SLASH = '/'
export const EQUALS = '='
export const REF_SEPARATOR = ':'
export const FIRST_GROUP = '$1'
export const CASE_INSENSITIVE = 'i'
export const NONE: string[] = []
export const PLACEHOLDER = 'SUBSTITUTION'
export const EXPORT = 'export'
export const XARGS = 'xargs'
export const ALIAS = 'alias'
export const GIT = 'git'
export const PUSH = 'push'
export const CONFIG = 'config'
export const BRANCH = 'branch'
export const HEAD = 'HEAD'
export const PARENT = '..'
export const CONFIG_FLAGS = ['-c']
export const REPO_FLAGS = ['--repo']
export const LAST = -1
export const BLOCK = 'block'
export const ALLOW = 'allow'
export const ALLOWED: Verdict = { decision: ALLOW, rule: null, message: NOTHING }
export const GIT_PUSH = 'gitPush'
export const GIT_HOOKS = 'gitHooks'
export const GUARDRAIL_FILES = 'guardrailFiles'
export const COMMITTED_FILES = 'committedFiles'
export const LINE_PATTERN = 'linePattern'
export const DOCS_CURRENT = 'docsCurrent'
export const ESCAPED_MATCH = '\\$&'
export const GLOB_START = '^'
export const GLOB_END = '$'
export const GLOB_PARTS: Record<string, string> = { '**': '.*', '*': '[^/]*' }
export const PATH_KINDS = [GUARDRAIL_FILES, COMMITTED_FILES]
export const LANGUAGES: Language[] = ['es', 'en']
