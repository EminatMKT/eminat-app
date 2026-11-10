// Reads a `git ...` command the way git does: global options first (`-C dir`, `-c k=v`,
// `--git-dir dir`), then the subcommand and its own arguments.
import rules from '../rules.json' with { type: 'json' }

const { gitValueOptions } = rules.parsing
const CONFIG_FLAG = '-c'

const globalEnd = (words, index) => {
  if (index >= words.length || !words[index].startsWith('-')) return index
  return globalEnd(words, index + (gitValueOptions.includes(words[index]) ? 2 : 1))
}

const configs = (globals) =>
  globals.flatMap((word, index) => (globals[index - 1] === CONFIG_FLAG ? [word] : []))

export default function parseGit(words) {
  const end = globalEnd(words, 1)
  const globals = words.slice(1, end)
  return { configs: configs(globals), sub: words[end], args: words.slice(end + 1) }
}
