/** Defer the unrelated marketing-board preload only on the Meetings overview.
 * The first subsequent route that needs the shared board resumes the original read.
 */
export function deferredActivities<T>(isOverview: () => boolean, read: () => Promise<T>) {
  let deferred = false
  let pending: Promise<T> | null = null
  let ready: { value: T } | null = null
  const resume = (): Promise<T | null> => {
    if (isOverview() || (!deferred && !pending)) return Promise.resolve(null)
    if (pending) return pending
    if (ready) return Promise.resolve(ready.value)
    pending = read()
    const clear = () => { pending = null }
    void pending.then(value => { ready = { value }; clear() }, clear)
    return pending
  }
  return {
    initial: () => { if (isOverview()) { deferred = true; return Promise.resolve(null) }; return read() },
    resume,
    needed: () => deferred || pending !== null,
    applied: () => { deferred = false; ready = null },
  }
}
