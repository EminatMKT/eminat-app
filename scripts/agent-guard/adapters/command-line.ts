// The shell line a Codex shell call runs, from its `command` string or argv array. Only a patch
// apply_patch itself reads (its argv, or the heredoc after `apply_patch <<EOF`) is file text and
// is cut out; patch markers anywhere else stay part of the code that runs.
import { SPACE } from '../core/constants'
import {
  APPLY_PATCH,
  ESCAPED_QUOTE,
  PATCH_HEREDOC,
  QUOTE,
  SAFE_WORD,
} from './constants'
import isText from './is-text'
import type { CommandField } from './types'

const quoted = (word: string): string => QUOTE + word.replaceAll(QUOTE, ESCAPED_QUOTE) + QUOTE

const quote = (word: string): string => (SAFE_WORD.test(word) ? word : quoted(word))

const unpatched = (text: string): string => text.replace(PATCH_HEREDOC, APPLY_PATCH)

const runsApplyPatch = ([program]: string[]): boolean => program === APPLY_PATCH

const argvLine = (argv: string[]): string =>
  runsApplyPatch(argv) ? APPLY_PATCH : argv.map(unpatched).map(quote).join(SPACE)

/** The shell line of a Codex `command`/`cmd` field, without the patch apply_patch reads. */
export default function commandLine(command: CommandField | undefined): string | undefined {
  if (Array.isArray(command)) return argvLine(command)

  return isText(command) ? unpatched(command) : command
}
