// Builds the warning shown when a rule stops a command: the good-practice framing, what
// the command would have done and the correct path, in Spanish first and English after.
import rules from '../rules.json' with { type: 'json' }

const line = (rule, language) =>
  `${rules.framing[language]} ${rule.does[language]} ${rules.routes[rule.route][language]}`

export default function message(rule) {
  return `${line(rule, 'es')}\n${line(rule, 'en')}`
}
