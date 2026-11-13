// Whether a repo-relative path matches a glob from rules.json: `**` spans folders, `*` stays
// inside one name, and every other character stands for itself.
import {
  ESCAPED_MATCH,
  GLOB_END,
  GLOB_PARTS,
  GLOB_START,
} from './constants'
import { GLOB_SPECIAL, GLOB_WILDCARD } from './constants/patterns'

const wildcard = (wild: string): string => GLOB_PARTS[wild]

/** Whether the whole path matches the glob. */
export default function globHit(glob: string, path: string): boolean {
  const escaped = glob.replace(GLOB_SPECIAL, ESCAPED_MATCH)
  const source = GLOB_START + escaped.replace(GLOB_WILDCARD, wildcard) + GLOB_END

  return new RegExp(source).test(path)
}
