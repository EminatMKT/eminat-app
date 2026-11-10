// Where the agent stands: the hook call's directory, the top of the git checkout around it,
// its branch, the committedFiles files already in HEAD and what the branch changes (changed).
// Outside a checkout the directory is the root, the branch is empty and both lists are empty.
import {
  COMMITTED_FILES,
  NEWLINE,
  NONE,
  NOTHING,
  RULES,
} from '../core/constants'
import ask from './ask'
import changed from './changed'
import { BRANCH_ARGS, LS_TREE, TOPLEVEL } from './constants'

const committedRules = RULES.rules.filter((rule) => rule.kind === COMMITTED_FILES)
const watched = committedRules.flatMap((rule) => rule.paths)

const committed = (root: string): string[] => {
  const args = [...LS_TREE, ...watched]
  const listed = watched.length ? ask(args, root) : null

  return listed ? listed.split(NEWLINE) : NONE
}

const placeOf = (here: string, root: string) => ({
  cwd: here,
  root,
  branch: ask(BRANCH_ARGS, here) ?? NOTHING,
  committed: committed(root),
  changed: changed(root),
})

/** Where a hook call stands: its directory, checkout root, branch and the two file lists. */
export default function context(cwd?: string) {
  const here = cwd || process.cwd()

  return placeOf(here, ask(TOPLEVEL, here) ?? here)
}
