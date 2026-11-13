// The regular expressions the core reads shell lines, git refs and paths with. The longest
// one is assembled from named parts so each part fits on a line.
const OPERATOR = String.raw`(&&|\|\||;;?|\|&?|&|\n|\(|\)|>>?|<)`
const WORD = String.raw`((?:[^\s'"\\;&|<>()]|\\[\s\S]|'[^']*'|"(?:[^"\\]|\\[\s\S])*")+|\S)`
const PIECE_SOURCE = `[^\\S\\n]*(?:${OPERATOR}|${WORD})`
const STICKY = 'gy'

export const PIECE = new RegExp(PIECE_SOURCE, STICKY)
export const LITERAL = /'((?:[^'\\]|\\[\s\S])*)'|"((?:[^"\\]|\\[\s\S])*)"|`((?:[^`\\]|\\[\s\S])*)`/g
export const QUOTED = /'([^']*)'|"((?:[^"\\]|\\[\s\S])*)"|\\([\s\S])/g
export const ESCAPED = /\\([\s\S])/g
export const REDIRECT = /^>>?$/
export const TRAILING_BLANK = /\s+$/
export const CONTINUATION = /\\\r?\n/g
export const ATTACHED_CONFIG = /^-c(.+)$/
export const LONG_OPTION = /^--\w/
export const TARGET_DIRECTORY = /^--target-directory=(.+)$/
export const SUBSTITUTION = /\$\(([^()]*)\)|`([^`]*)`/g
export const ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)=/
export const RUNNER_OPTION = /^(-|\d)/
export const SHELL_SCRIPT_FLAG = /^-[a-z]*c[a-z]*$/
export const VERSION_SUFFIX = /(.)@.*$/
export const ALIAS_VALUE = /^[^=]+=([\s\S]*)$/
export const LIST = /\[([^\]]*)\]/g
export const IN_PLACE = /^(-i|--in-place)/
export const OPTION = /^-/
export const REWRITING = /^[+:]/
export const HEADS_PREFIX = /^refs\/heads\//
export const FORCE_MARK = /^\+/
export const SHORT_FLAG = /^-\w/
export const LEADING_DOT_SLASH = /^\.\//
export const GLOB_SPECIAL = /[.+^${}()|[\]\\?]/g
export const GLOB_WILDCARD = /\*\*|\*/g
