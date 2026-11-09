import now from './clock'
import { NOW_TICK_MS } from './constants'

/** Hands the current time to `onTick` right away and then once a minute; returns the cleanup
 *  that stops it, shaped to be returned straight from a `useEffect`. */
export default function startTicking(onTick: (reading: Date) => void): () => void {
  const tick = () => onTick(now())

  tick()
  const timer = setInterval(tick, NOW_TICK_MS)
  const stop = () => clearInterval(timer)

  return stop
}

// The timer lives here, not in the effect, so its cadence and its cleanup are tested directly.
