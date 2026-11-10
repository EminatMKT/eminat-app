type StorageEntry = readonly [key: string, value: string]

/** Runs in the browser through Playwright's `addInitScript`, before any app script: seeds
 *  localStorage with the given entries, in order. */
export default function writeLocalStorage(entries: readonly StorageEntry[]): void {
  for (const [key, value] of entries) localStorage.setItem(key, value)
}
