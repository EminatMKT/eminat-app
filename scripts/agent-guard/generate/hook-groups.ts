// The PreToolUse section both CLIs read the same way: one matcher group per matcher, each
// running the same hook handler.
import type { Handler, Hooks } from './types'

/** The `hooks` object of a CLI config, for these tool matchers and this handler. */
export default function hookGroups(matchers: string[], handler: Handler): Hooks {
  const groups = matchers.map((matcher) => ({ matcher, hooks: [handler] }))
  const hooks = { PreToolUse: groups }

  return hooks
}
