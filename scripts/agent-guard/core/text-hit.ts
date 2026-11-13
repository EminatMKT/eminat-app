import { CASE_INSENSITIVE } from './constants'

/** Whether a rule's pattern (written in rules.json) matches a text, ignoring case. */
export default function textHit(pattern: string, text: string): boolean {
  return new RegExp(pattern, CASE_INSENSITIVE).test(text)
}
