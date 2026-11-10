// Where the agent is standing: the working directory of the hook call, the top of the
// git checkout around it, its current branch and the files that already exist in HEAD under
// the folders of the committedFiles rules (so the core can tell a committed migration from a
// new one without touching git itself). Outside a checkout the directory itself is the root,
// the branch is empty and nothing is committed, so path rules still resolve.
import { spawnSync } from 'node:child_process'
import rules from '../rules.json' with { type: 'json' }

const GIT = 'git'
const TOPLEVEL = ['rev-parse', '--show-toplevel']
const BRANCH = ['rev-parse', '--abbrev-ref', 'HEAD']
const LS_TREE = ['ls-tree', '-r', '--name-only', 'HEAD', '--']
const COMMITTED_KIND = 'committedFiles'
const ENCODING = 'utf8'
const NO_BRANCH = ''
const NEWLINE = '\n'

const ask = (args, cwd) => {
  const result = spawnSync(GIT, args, { cwd, encoding: ENCODING })
  return result.status === 0 ? result.stdout.trim() : null
}

const watched = rules.rules.filter((rule) => rule.kind === COMMITTED_KIND).flatMap((rule) => rule.paths)

const committed = (root) => {
  const listed = watched.length ? ask([...LS_TREE, ...watched], root) : null
  return listed ? listed.split(NEWLINE) : []
}

export default function context(cwd) {
  const here = cwd || process.cwd()
  const root = ask(TOPLEVEL, here) ?? here
  return { cwd: here, root, branch: ask(BRANCH, here) ?? NO_BRANCH, committed: committed(root) }
}
