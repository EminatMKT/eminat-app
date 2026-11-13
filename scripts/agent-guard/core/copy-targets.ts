// The paths a copy (cp, install, rsync, ln) writes: only its destination, the last operand or
// the `-t` / `--target-directory` folder. Its sources are only read, so they are never targets.
import { LAST, NONE, RULES } from './constants'
import { TARGET_DIRECTORY } from './constants/patterns'
import followers from './followers'
import groupList from './group-list'
import operands from './operands'

const { copiers, copyTargetFlags } = RULES.parsing.fileMutation

const attachedTarget = (arg: string): string[] => groupList(TARGET_DIRECTORY, arg)

/** The paths a simple command writes as the destination of a copy, or none. */
export default function copyTargets([program, ...args]: string[]): string[] {
  if (!copiers.includes(program)) return NONE

  const flagged = followers(args, copyTargetFlags)

  return [...operands(args).slice(LAST), ...flagged, ...args.flatMap(attachedTarget)]
}
