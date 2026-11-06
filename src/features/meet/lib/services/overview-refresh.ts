/** Only in-flight reads are shared; no cross-user or persistent result cache. */
const reads = new Map<string, Promise<unknown>>()
export function overviewRead<T>(key: string, read: () => Promise<T>): Promise<T> {
  const existing = reads.get(key)
  if (existing) return existing as Promise<T>
  const pending = Promise.resolve().then(read)
  reads.set(key, pending)
  const clear = () => { if (reads.get(key) === pending) reads.delete(key) }
  void pending.then(clear, clear)
  return pending
}

/** Coalesce same-turn focus/visibility/timer events. A trigger received during a
 * read retains ONE trailing refresh so changes after its snapshot are not lost.
 */
export function overviewRefresh(run: () => Promise<unknown>, onError: (error: unknown) => void) {
  let disposed = false
  let running = false
  let scheduled = false
  let trailing = false
  let lastActivation = -Infinity
  const trigger = () => {
    if (disposed) return
    if (running) { trailing = true; return }
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      if (disposed) return
      running = true
      void Promise.resolve().then(run).catch(error => { if (!disposed) onError(error) }).finally(() => {
        running = false
        if (trailing && !disposed) { trailing = false; trigger() }
      })
    })
  }
  const activation = () => {
    // Browsers emit both focus and visible-again for one activation, often in
    // separate event-loop turns. Only that short duplicate burst is suppressed.
    const now = Date.now()
    if (now - lastActivation < 100) return
    lastActivation = now
    trigger()
  }
  return { trigger, activation, dispose: () => { disposed = true; trailing = false } }
}
