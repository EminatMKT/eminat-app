// Builds the warning shown when a rule stops a command: the good-practice framing, what the
// command would have done and the correct path, in Spanish first and English after.
import {
  LANGUAGES,
  NEWLINE,
  RULES,
  SPACE,
} from './constants'
import type { Language, Rule } from './types'

const line = (rule: Rule, language: Language): string => {
  const route = RULES.routes[rule.route]
  const parts = [RULES.framing[language], rule.does[language], route[language]]

  return parts.join(SPACE)
}

/** The block message for a rule, one line per language. */
export default function message(rule: Rule): string {
  const lines = LANGUAGES.map((language) => line(rule, language))

  return lines.join(NEWLINE)
}
