import type { I18nKey } from '@/shared/i18n'

/** Shows a line through `show` and clears it after `lifeMs`; a new line restarts the time. */
export default function fadeTimer(show: (key: I18nKey | null) => void, lifeMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const stop = () => clearTimeout(timer)
  const say = (key: I18nKey) => {
    stop()
    show(key)
    timer = setTimeout(() => show(null), lifeMs)
  }
  const handle = { say, stop }
  return handle
}

// The timing of a confirmation, apart from React so a test runs it on fake timers. One timer
// lives at a time: the old one is cleared, so it can never erase a newer line early.
