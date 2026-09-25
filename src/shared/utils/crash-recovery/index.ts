import { RELOAD, SHOW, CHUNK_LOAD_ERROR_NAME, CHUNK_LOAD_MESSAGE, RELOAD_WINDOW_MS } from './constants/recovery'
import type { CrashRecovery } from './constants/recovery'

type Input = {
  error: Error
  /** When this tab last reloaded on its own, in epoch ms; 0 when it never did. */
  lastReloadAt: number
  now: number
}

/** Decides what the crash screen does with an error: reload the page once, or show itself.
 *  Only a missing chunk earns the reload, and only one per window. */
export default function decideCrashRecovery({ error, lastReloadAt, now }: Input): CrashRecovery {
  const missingChunk = error.name === CHUNK_LOAD_ERROR_NAME || CHUNK_LOAD_MESSAGE.test(error.message)
  const reloadedRecently = now - lastReloadAt <= RELOAD_WINDOW_MS
  return missingChunk && !reloadedRecently ? RELOAD : SHOW
}

// A chunk that did not arrive —a corrupted build, a flaky network, a tab open across a deploy—
// is usually fixed by loading the page again, so nobody should have to press anything. Any
// other error would fail the same way after a reload, so it goes straight to the screen.
