// The files the checked-out branch changes since it left `origin/main` (merge base to HEAD),
// which a docsCurrent rule reads. Outside a checkout, or without that ref (no remote, never
// fetched), the list is empty and the rule lets the push through: it cannot see the changes.
import { NEWLINE, NONE } from '../core/constants'
import ask from './ask'
import { CHANGED_SINCE_BASE } from './constants'

/** The files the branch at root changes against `origin/main`, or none. */
export default function changed(root: string): string[] {
  const listed = ask(CHANGED_SINCE_BASE, root)

  return listed ? listed.split(NEWLINE) : NONE
}
