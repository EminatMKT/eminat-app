// Values rules become prefixes and permission rules with: the kinds that carry a plain prefix,
// the spellings of a pushed protected branch and the Claude Code rule forms.
import type { Pattern } from '../types'

export const NO_PATTERNS: Pattern[] = []
export const FORBIDDEN = 'forbidden'
export const KINDS = {
  prefix: 'prefix',
  withPattern: 'prefixWithPattern',
  anyToken: 'anyToken',
  programExcept: 'programExcept',
}
export const REF_PREFIXES = ['+', ':', 'HEAD:']
export const DASH = '-'
export const NO_WORDS: string[][] = [[]]
export const RULE_TOKEN = '{words}'
export const BASH_RULE = 'Bash({words} *)'
export const EDIT_RULES = ['Edit(/{words})', 'Edit(/{words}/**)']
export const READ_RULE = 'Read({words})'
