// The same prefix behind each package runner Codex may launch it with (`pnpm exec`, `npx`...),
// the bare command first: execpolicy only matches from the first word.
import { SOURCE } from './constants'
import type { Pattern } from './types'

/** One pattern per package runner listed in rules.json, the bare one included. */
export default function withRunners(pattern: Pattern): Pattern[] {
  const patterns = SOURCE.parsing.codexRunners.map((runner) => [...runner, ...pattern])

  return patterns
}
