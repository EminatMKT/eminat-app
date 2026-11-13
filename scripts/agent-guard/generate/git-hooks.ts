// The prefixes of a gitHooks rule: pointing the hooks config key elsewhere, and each
// subcommand's hook-skipping flag when it comes right after the subcommand.
import { CONFIG, GIT } from '../core'
import type { GuardRule, Pattern } from './types'

const skipping = ([sub, flags]: [string, string[]]): Pattern => [GIT, sub, flags]

/** Every argv prefix of a gitHooks rule that execpolicy and Claude's Bash rules can match. */
export default function gitHooks({ configKeys, noVerify }: GuardRule): Pattern[] {
  const config: Pattern = [GIT, CONFIG, configKeys]
  const skips = Object.entries(noVerify).map(skipping)
  const patterns = [config, ...skips]

  return patterns
}
