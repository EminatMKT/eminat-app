// Turns a shell line into the list of simple commands it would run, each one with its
// leading variable assignments apart and its runners (pnpm, npx, sudo...) peeled off.
// Nested shells (`bash -c '...'`, `eval`), interpreter inline code (`node -e`...) and
// substitutions (`$(...)`, backticks) are opened and their commands are added to the list.
// An alias value is added too, marked `alias`, and a command run through xargs is marked
// `xargs` (its real arguments arrive at run time).
import rules from '../rules.json' with { type: 'json' }
import tokenize from './tokenize.mjs'

const { runners, shells, evaluators, wrappers, inlineCodeFlags } = rules.parsing
const SUBSTITUTION = /\$\(([^()]*)\)|`([^`]*)`/g
const ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)=/
const RUNNER_OPTION = /^(-|\d)/
const SHELL_SCRIPT_FLAG = /^-[a-z]*c[a-z]*$/
const PLACEHOLDER = 'SUBSTITUTION'

const startsWith = (words, prefix) => prefix.every((word, index) => words[index] === word)

const peelRunner = (words) => {
  const runner = runners.find((prefix) => startsWith(words, prefix))
  if (!runner) return words
  const rest = words.slice(runner.length)
  const first = rest.findIndex((word) => !RUNNER_OPTION.test(word))
  return first < 0 ? [] : rest.slice(first)
}

const peel = (words, env) => {
  const assignment = words.length ? ASSIGNMENT.exec(words[0]) : null
  if (assignment) return peel(words.slice(1), [...env, assignment[1]])
  if (words.length && wrappers.includes(words[0])) return peel(words.slice(1), env)
  const peeled = peelRunner(words)
  return peeled === words ? { env, words } : peel(peeled, env)
}

const VERSION_SUFFIX = /(.)@.*$/

const name = (word) => word.split('/').pop().replace(VERSION_SUFFIX, '$1')

const program = (words) => (words.length ? [name(words[0]), ...words.slice(1)] : words)

const exported = (words) =>
  words[0] === 'export' ? words.slice(1).flatMap((word) => ASSIGNMENT.exec(word)?.[1] ?? []) : []

const XARGS = 'xargs'
const ALIAS = 'alias'
const ALIAS_VALUE = /^[^=]+=([\s\S]*)$/

const simple = (words) => {
  const peeled = peel(words, [])
  const xargs = words.slice(0, words.length - peeled.words.length).includes(XARGS)
  return { env: [...peeled.env, ...exported(peeled.words)], words: program(peeled.words), xargs }
}

// Interpreter inline code (`python3 -c`, `node -e`, `perl -e`...): every string literal in
// it may be a command handed to os.system / execSync / system(...), and the literals of one
// `[...]` list are joined, the way subprocess.run(['git', 'push']) spells a command. A
// heuristic over literals: a command assembled from pieces at run time is not seen.
const LITERAL = /'((?:[^'\\]|\\[\s\S])*)'|"((?:[^"\\]|\\[\s\S])*)"|`((?:[^`\\]|\\[\s\S])*)`/g
const LIST = /\[([^\]]*)\]/g
const SPACE = ' '
const NONE = []

const literals = (code) => [...code.matchAll(LITERAL)].map((match) => match[1] ?? match[2] ?? match[3])

const lists = (code) => [...code.matchAll(LIST)].map((match) => literals(match[1]).join(SPACE))

const inlineSources = (words) => {
  const flags = inlineCodeFlags[words[0]] ?? NONE
  const at = words.findIndex((word, index) => index > 0 && flags.includes(word))
  const code = at > 0 ? (words[at + 1] ?? '') : ''
  return [...literals(code), ...lists(code)]
}

const shellScript = (words) => {
  const flag = words.findIndex((word) => SHELL_SCRIPT_FLAG.test(word))
  return flag > 0 ? [words[flag + 1] ?? ''] : []
}

const nested = ({ words }) => {
  if (evaluators.includes(words[0])) return [words.slice(1).join(' ')]
  return shells.includes(words[0]) ? shellScript(words) : inlineSources(words)
}

const aliasValues = ({ words }) =>
  words[0] === ALIAS ? words.slice(1).flatMap((word) => ALIAS_VALUE.exec(word)?.[1] ?? []) : []

const asAlias = (command) => ({ ...command, alias: true })

const split = (pieces) =>
  pieces.reduce((all, piece) => {
    if (piece.operator) all.push([])
    else all[all.length - 1].push(piece.word)
    return all
  }, [[]])

export default function segments(line) {
  const inner = [...line.matchAll(SUBSTITUTION)].map((match) => match[1] ?? match[2])
  const own = split(tokenize(line.replace(SUBSTITUTION, PLACEHOLDER))).map(simple)
  const opened = own.flatMap(nested)
  const aliased = own.flatMap(aliasValues).flatMap(segments).map(asAlias)
  return [...own, ...[...inner, ...opened].flatMap(segments), ...aliased]
}
