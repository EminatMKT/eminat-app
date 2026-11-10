import { NONE } from './constants'

/** The first capture of `pattern` in `text` as a one-item list, or an empty list. */
export default function groupList(pattern: RegExp, text: string): string[] {
  const found = pattern.exec(text)

  return found ? [found[1]] : NONE
}
