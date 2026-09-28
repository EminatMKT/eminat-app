import { useEffect, useState } from 'react'
import { decideCrashRecovery, RELOAD, SHOW, DECIDING, RELOAD_STAMP_KEY, type CrashRecovery } from '@/shared/utils'

type Step = CrashRecovery | typeof DECIDING

/** What the crash screen should be doing with `error`: still deciding, reloading, or showing
 *  itself. A missing chunk reloads the page once; the tab is stamped BEFORE the reload. */
export default function useCrashRecovery(error: Error): Step {
  const [step, setStep] = useState<Step>(DECIDING)
  useEffect(() => { setStep(recover(error)) }, [error])
  return step
}

function recover(error: Error): CrashRecovery {
  try {
    const now = Date.now()
    const lastReloadAt = Number(window.sessionStorage.getItem(RELOAD_STAMP_KEY)) || 0
    const step = decideCrashRecovery({ error, lastReloadAt, now })
    if (step !== RELOAD) return step
    window.sessionStorage.setItem(RELOAD_STAMP_KEY, String(now))
    window.location.reload()
    return step
  } catch {
    return SHOW
  }
}

// The stamp is what makes a loop impossible: it is written before reloading, and a tab that
// cannot write it (private mode, blocked storage) never reloads on its own — it shows the screen.
